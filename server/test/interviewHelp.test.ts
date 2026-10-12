import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { createInterviewHelpRouter } from "../src/routes/interviewHelpRoutes";
import {
  interviewHelpInstructions,
  interviewHelpRequestSchema,
  interviewHelpOutputSchema,
} from "../src/interviewHelp";

const request = {
  mode: "hint" as const,
  job: {
    companyName: "Hive",
    jobName: "Engineer",
    description: "Build software",
    cv: "Engineer",
  },
  round: "intro" as const,
  difficulty: "medium" as const,
  question: {
    type: "general" as const,
    prompt: "Introduce yourself",
    focus: "Introduction",
    language: "plaintext" as const,
    starterCode: "",
  },
  language: "plaintext" as const,
};
test("help needs a matching question but no candidate answer and bounds hint length", () => {
  assert.equal(interviewHelpRequestSchema.safeParse(request).success, true);
  assert.equal(
    interviewHelpRequestSchema.safeParse({ ...request, question: null })
      .success,
    false
  );
  assert.equal(
    interviewHelpRequestSchema.safeParse({ ...request, mode: "grade" }).success,
    false
  );
  assert.equal(
    interviewHelpRequestSchema.safeParse({ ...request, round: "technical" })
      .success,
    false
  );
  assert.equal(
    interviewHelpOutputSchema("hint").safeParse({ text: "x".repeat(351) })
      .success,
    false
  );
  assert.match(interviewHelpInstructions(request), /at most 50 words/);
  assert.match(
    interviewHelpInstructions({ ...request, mode: "answer" }),
    /strongest model answer directly/
  );
  assert.match(
    interviewHelpInstructions(request),
    /Do not evaluate, grade, score/
  );
});

test("help endpoint enforces access and returns only help, with safe failure responses", async () => {
  let calls = 0;
  let output: unknown = { text: "Use a relevant example." };
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createInterviewHelpRouter({
      canUseAI: (token) => token === "test-token",
      generate: async () => {
        calls++;
        return output;
      },
    })
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const post = (body: unknown, token = "test-token") =>
    fetch(`http://127.0.0.1:${address.port}/api/interview/help`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-token": token },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post(request, "bad")).status, 403);
    assert.equal((await post({ ...request, mode: "unknown" })).status, 400);
    assert.equal(calls, 0);
    assert.deepEqual(await (await post(request)).json(), output);
    output = { text: "Strong example answer." };
    assert.deepEqual(
      await (await post({ ...request, mode: "answer" })).json(),
      output
    );
    output = { text: "x".repeat(351) };
    assert.equal((await post(request)).status, 502);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
