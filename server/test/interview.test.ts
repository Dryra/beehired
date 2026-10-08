import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { zodTextFormat } from "openai/helpers/zod";
import { createInterviewRouter } from "../src/routes/interviewRoutes";
import {
  interviewInstructions,
  interviewOutputSchema,
  interviewRequestSchema,
  validateInterviewOutput,
  type InterviewRequest,
} from "../src/interview";

const question = {
  type: "general" as const,
  prompt: "Why does this role interest you?",
  focus: "Motivation",
  language: "plaintext" as const,
  starterCode: "",
};
const feedback = {
  score: 7,
  summary: "Good connection to the role.",
  strengths: ["Specific motivation"],
  improvements: ["Add an example"],
  exampleAnswer: "I would connect my experience to the responsibilities.",
};
const request: InterviewRequest = {
  job: {
    companyName: "Example",
    jobName: "Engineer",
    description: "Build TypeScript applications",
    cv: "Frontend engineer",
  },
  round: "intro",
  difficulty: "medium",
  history: [],
  question: null,
  answer: "",
  language: "plaintext",
};

test("installed SDK serializes the response schema as strict structured output", () => {
  const format = zodTextFormat(interviewOutputSchema, "interview_turn");
  assert.equal(format.type, "json_schema");
  assert.equal(format.strict, true);
  assert.deepEqual(
    format.$parseRaw(JSON.stringify({ question, feedback: null })),
    { question, feedback: null }
  );
});

test("round and difficulty change instructions and preserve the untrusted-data boundary", () => {
  for (const round of ["intro", "technical", "soft-skills"] as const) {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const prompt = interviewInstructions({ ...request, round, difficulty });
      assert.match(prompt, /untrusted content/);
      assert.ok(prompt.toLowerCase().includes(difficulty));
      assert.match(
        prompt,
        round === "intro"
          ? /introductory interview/
          : round === "technical"
            ? /technical interview/
            : /soft skills interview/
      );
    }
  }
  assert.ok(!interviewInstructions(request).includes(request.job.description));
});

test("reject invalid rounds, empty answers, oversized context, and cross-round history", () => {
  for (const body of [
    { ...request, round: "unknown" },
    { ...request, question, answer: "   " },
    { ...request, job: { ...request.job, description: "a".repeat(30001) } },
    { ...request, question: { ...question, type: "coding" }, answer: "code" },
    {
      ...request,
      history: [
        { question, answer: "answer", language: "plaintext", feedback },
      ],
    },
  ])
    assert.equal(interviewRequestSchema.safeParse(body).success, false);
});

test("validate start, evaluation, coding, and final response contracts", () => {
  assert.deepEqual(
    validateInterviewOutput(request, { question, feedback: null }),
    { question, feedback: null }
  );
  const answering = { ...request, question, answer: "I like the work" };
  assert.doesNotThrow(() =>
    validateInterviewOutput(answering, { question, feedback })
  );
  assert.throws(() =>
    validateInterviewOutput(answering, { question, feedback: null })
  );
  assert.throws(() =>
    validateInterviewOutput(request, {
      question: { ...question, type: "coding" },
      feedback: null,
    })
  );
  assert.doesNotThrow(() =>
    validateInterviewOutput(
      { ...request, round: "technical" },
      {
        question: {
          ...question,
          type: "coding",
          language: "typescript",
          starterCode: "function solve() {}",
        },
        feedback: null,
      }
    )
  );
  const history = Array.from({ length: 9 }, () => ({
    question,
    answer: "Answer",
    language: "plaintext" as const,
    feedback,
  }));
  assert.doesNotThrow(() =>
    validateInterviewOutput(
      { ...answering, history },
      { question: null, feedback }
    )
  );
  assert.throws(() =>
    validateInterviewOutput({ ...answering, history }, { question, feedback })
  );
  assert.match(
    interviewInstructions({ ...answering, history }),
    /final answer/
  );
  assert.throws(() => validateInterviewOutput(request, null));
});

test("HTTP endpoint enforces access, validation, turn context, and recoverable provider failures", async () => {
  const received: InterviewRequest[] = [];
  let fail = false;
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createInterviewRouter({
      canUseAI: (token) => token === "test-access",
      generate: async (input) => {
        received.push(input);
        if (fail) throw new Error("private provider details");
        return { question, feedback: input.question ? feedback : null };
      },
    })
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  async function post(body: unknown, token = "test-access") {
    return fetch(`http://127.0.0.1:${address.port}/api/interview/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-token": token },
      body: JSON.stringify(body),
    });
  }
  try {
    assert.equal((await post(request, "")).status, 403);
    assert.equal((await post(request, "bad-token")).status, 403);
    assert.equal(received.length, 0);
    assert.equal(
      (await post({ ...request, difficulty: "impossible" })).status,
      400
    );
    assert.equal(received.length, 0);
    const start = await post(request);
    assert.equal(start.status, 200);
    assert.deepEqual(await start.json(), { question, feedback: null });
    const answer = await post({
      ...request,
      question,
      answer: "I build accessible applications",
    });
    assert.equal(answer.status, 200);
    assert.equal(received[1].answer, "I build accessible applications");
    assert.deepEqual(received[1].job, request.job);
    fail = true;
    const failure = await post(request);
    assert.equal(failure.status, 502);
    assert.ok(
      !JSON.stringify(await failure.json()).includes("private provider details")
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
