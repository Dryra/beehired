// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewCompanion } from "./InterviewCompanion";
import { JobsList } from "./jobs";

vi.mock("./InterviewCodeEditor", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Your code answer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
const job = {
  id: "job-1",
  companyName: "Example",
  jobName: "Engineer",
  applicationStatus: "in-progress",
  matchScore: 90,
  jobDescription: "Build TypeScript applications",
};
const question = {
  type: "general",
  prompt: "Why does this role interest you?",
  focus: "Motivation",
  language: "plaintext",
  starterCode: "",
};
const feedback = {
  score: 7,
  summary: "Good connection to the role.",
  strengths: ["Specific motivation"],
  improvements: ["Add an example"],
  exampleAnswer: "Connect your experience to the responsibilities.",
};
const fetchMock = vi.fn();
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function open() {
  return render(
    <InterviewCompanion jobId="job-1" token="test-token" onBack={vi.fn()} />
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("savedAnalyses", JSON.stringify([job]));
  localStorage.setItem("savedCv", "My CV");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("interview companion", () => {
  it("shows the assistant link only for in-progress jobs", () => {
    localStorage.setItem(
      "savedAnalyses",
      JSON.stringify([
        job,
        { ...job, id: "job-2", applicationStatus: "applied" },
      ])
    );
    render(<JobsList onBack={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Application tracker" })
    );
    const links = screen.getAllByRole("link", {
      name: "Practice interview for Engineer",
    });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("#/interview/job-1");
  });

  it("sends job context and answers, then waits for Next before showing the follow-up", async () => {
    fetchMock.mockResolvedValueOnce(reply({ question, feedback: null }));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByText(question.prompt);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(first.job.description).toBe(job.jobDescription);
    expect(first.job.cv).toBe("My CV");
    expect(fetchMock.mock.calls[0][1].headers["x-demo-token"]).toBe(
      "test-token"
    );
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "I love building useful tools" },
    });
    const next = {
      ...question,
      prompt: "Tell me about a relevant project",
      focus: "Experience",
    };
    fetchMock.mockResolvedValueOnce(reply({ question: next, feedback }));
    fireEvent.click(screen.getByRole("button", { name: "Get feedback" }));
    await screen.findByRole("heading", { name: "Your feedback" });
    expect(screen.queryByText(next.prompt)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next question →" }));
    expect(screen.getByText(next.prompt)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "My project" },
    });
    fetchMock.mockResolvedValueOnce(reply({ question, feedback }));
    fireEvent.click(screen.getByRole("button", { name: "Get feedback" }));
    await screen.findByRole("heading", { name: "Your feedback" });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).history[0].answer).toBe(
      "I love building useful tools"
    );
  });

  it("keeps the answer after a failed request and allows retry", async () => {
    fetchMock.mockResolvedValueOnce(reply({ question, feedback: null }));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    fireEvent.change(await screen.findByLabelText("Your answer"), {
      target: { value: "Keep my answer" },
    });
    fetchMock.mockResolvedValueOnce(reply({ error: "Please try again" }, 502));
    fireEvent.click(screen.getByRole("button", { name: "Get feedback" }));
    await screen.findByRole("alert");
    expect(
      (screen.getByLabelText("Your answer") as HTMLTextAreaElement).value
    ).toBe("Keep my answer");
    expect(
      (
        screen.getByRole("button", {
          name: "Get feedback",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it("switches round/difficulty, renders code answers, and keeps independent sessions", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Interview round"), {
      target: { value: "technical" },
    });
    fireEvent.change(screen.getByLabelText("Difficulty"), {
      target: { value: "hard" },
    });
    fetchMock.mockResolvedValueOnce(
      reply({
        question: {
          ...question,
          type: "coding",
          language: "typescript",
          starterCode: "function solve() {}",
        },
        feedback: null,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    const editor = await screen.findByLabelText("Your code answer");
    expect((editor as HTMLTextAreaElement).value).toBe("function solve() {}");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      round: "technical",
      difficulty: "hard",
    });
    fireEvent.change(editor, {
      target: { value: "function solve() { return 1; }" },
    });
    fireEvent.change(screen.getByLabelText("Interview round"), {
      target: { value: "soft-skills" },
    });
    expect(screen.getByRole("button", { name: "Start practice" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Interview round"), {
      target: { value: "technical" },
    });
    expect(
      (
        (await screen.findByLabelText(
          "Your code answer"
        )) as HTMLTextAreaElement
      ).value
    ).toContain("return 1");
  });

  it("requires a description for legacy jobs and saves it before starting", async () => {
    localStorage.setItem(
      "savedAnalyses",
      JSON.stringify([{ ...job, jobDescription: undefined }])
    );
    open();
    expect(
      (
        screen.getByRole("button", {
          name: "Start practice",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    fireEvent.change(
      screen.getByLabelText("Add the original description for this saved job"),
      { target: { value: "Original listing" } }
    );
    fetchMock.mockResolvedValueOnce(reply({ question, feedback: null }));
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByText(question.prompt);
    expect(
      JSON.parse(localStorage.getItem("savedAnalyses")!)[0].jobDescription
    ).toBe("Original listing");
  });

  it("prevents starting without access and handles missing jobs", () => {
    const view = render(
      <InterviewCompanion jobId="job-1" token={null} onBack={vi.fn()} />
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Start practice",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    view.unmount();
    render(
      <InterviewCompanion jobId="missing" token="token" onBack={vi.fn()} />
    );
    expect(screen.getByText("This saved job could not be found.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("completes ten answers and starts a fresh session with no previous history", async () => {
    fetchMock.mockResolvedValueOnce(reply({ question, feedback: null }));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    for (let i = 0; i < 10; i++) {
      fireEvent.change(await screen.findByLabelText("Your answer"), {
        target: { value: `Answer ${i + 1}` },
      });
      fetchMock.mockResolvedValueOnce(
        reply({ question: i === 9 ? null : question, feedback })
      );
      fireEvent.click(screen.getByRole("button", { name: "Get feedback" }));
      await screen.findByRole("heading", { name: "Your feedback" });
      if (i < 9)
        fireEvent.click(
          screen.getByRole("button", { name: "Next question →" })
        );
    }
    expect(
      screen.getByRole("heading", { name: "Practice complete" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Next question →" })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Start a fresh session" })
    );
    fetchMock.mockResolvedValueOnce(reply({ question, feedback: null }));
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByLabelText("Your answer");
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1].body).history).toEqual(
      []
    );
  });

  it("disables round changes and prevents duplicate starts during a request", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done;
      })
    );
    open();
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    expect(
      (screen.getByLabelText("Interview round") as HTMLSelectElement).disabled
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Preparing your first question…" })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(reply({ question, feedback: null }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Interview round") as HTMLSelectElement).disabled
      ).toBe(false)
    );
  });
});
