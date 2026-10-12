// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpeechAnswerButton } from "./SpeechAnswerButton";
import { InterviewCompanion } from "./InterviewCompanion";

class FakeRecorder {
  static isTypeSupported = (type: string) => type.startsWith("audio/webm");
  static latest: FakeRecorder;
  mimeType = "audio/webm";
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeRecorder.latest = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({
        data: new Blob(["audio bytes"], { type: this.mimeType }),
      });
      this.onstop?.();
    });
  }
}
const stopTrack = vi.fn();
const stream = { getTracks: () => [{ stop: stopTrack }] };
const getUserMedia = vi.fn();
const fetchMock = vi.fn();
const onTranscript = vi.fn();
const onActivityChange = vi.fn();
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
function open() {
  return render(
    <SpeechAnswerButton
      token="test-token"
      disabled={false}
      onTranscript={onTranscript}
      onActivityChange={onActivityChange}
    />
  );
}
async function record() {
  fireEvent.click(screen.getByRole("button", { name: "Record spoken answer" }));
  await screen.findByRole("button", { name: "Stop recording and send answer" });
}
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  getUserMedia.mockReset().mockResolvedValue(stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("records, uploads with authentication, transcribes once and releases the microphone", async () => {
  fetchMock.mockResolvedValue(reply({ text: " My spoken answer " }));
  open();
  await record();
  expect(onActivityChange).toHaveBeenCalledWith(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Stop recording and send answer" })
  );
  await waitFor(() =>
    expect(onTranscript).toHaveBeenCalledExactlyOnceWith("My spoken answer")
  );
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/transcribe$/);
  expect(fetchMock.mock.calls[0][1].headers["x-demo-token"]).toBe("test-token");
  expect(fetchMock.mock.calls[0][1].body.get("audio").name).toBe("answer.webm");
  expect(stopTrack).toHaveBeenCalled();
  expect(onActivityChange).toHaveBeenLastCalledWith(false);
});

it("cancels a recording without uploading or sending", async () => {
  open();
  await record();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await act(async () => {});
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onTranscript).not.toHaveBeenCalled();
  expect(stopTrack).toHaveBeenCalled();
});

it("ignores a late permission result after cancellation", async () => {
  let resolve!: (value: typeof stream) => void;
  getUserMedia.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  open();
  fireEvent.click(screen.getByRole("button", { name: "Record spoken answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await act(async () => {
    resolve(stream);
  });
  expect(stopTrack).toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("handles denied microphone access without submitting", async () => {
  getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  open();
  fireEvent.click(screen.getByRole("button", { name: "Record spoken answer" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "permission was denied"
  );
  expect(onActivityChange).toHaveBeenLastCalledWith(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("keeps transcription failures and empty speech from being submitted", async () => {
  fetchMock.mockResolvedValueOnce(
    reply({ error: "No speech was recognized" }, 422)
  );
  open();
  await record();
  fireEvent.click(
    screen.getByRole("button", { name: "Stop recording and send answer" })
  );
  expect((await screen.findByRole("alert")).textContent).toContain("No speech");
  expect(onTranscript).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(reply({ text: "  " }));
  await record();
  fireEvent.click(
    screen.getByRole("button", { name: "Stop recording and send answer" })
  );
  await screen.findByRole("alert");
  expect(onTranscript).not.toHaveBeenCalled();
});

it("aborts uploads and ignores late results on unmount", async () => {
  let resolve!: (value: Response) => void;
  fetchMock.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const view = open();
  await record();
  fireEvent.click(
    screen.getByRole("button", { name: "Stop recording and send answer" })
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const signal = fetchMock.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => {
    resolve(reply({ text: "Too late" }));
  });
  expect(onTranscript).not.toHaveBeenCalled();
});

it("releases the microphone when leaving during a recording", async () => {
  const view = open();
  await record();
  view.unmount();
  await act(async () => {});
  expect(stopTrack).toHaveBeenCalled();
  expect(FakeRecorder.latest.state).toBe("inactive");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("automatically stops and submits after five minutes", async () => {
  vi.useFakeTimers();
  fetchMock.mockResolvedValue(reply({ text: "Timed answer" }));
  open();
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Record spoken answer" })
    );
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
  });
  expect(onTranscript).toHaveBeenCalledExactlyOnceWith("Timed answer");
  expect(stopTrack).toHaveBeenCalled();
});

it("shows a useful fallback when browser recording is unavailable", async () => {
  vi.stubGlobal("MediaRecorder", undefined);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Record spoken answer" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "HTTPS or localhost"
  );
  expect(getUserMedia).not.toHaveBeenCalled();
});

it("appends spoken words to the draft and submits the exact answer for evaluation", async () => {
  const question = {
    type: "general",
    prompt: "Introduce yourself",
    focus: "Introduction",
    language: "plaintext",
    starterCode: "",
  };
  localStorage.setItem(
    "savedAnalyses",
    JSON.stringify([
      {
        id: "speech-job",
        applicationStatus: "in-progress",
        jobName: "Engineer",
        companyName: "Hive",
        jobDescription: "Build software",
      },
    ])
  );
  fetchMock.mockResolvedValueOnce(reply({ question, feedback: null }));
  render(
    <InterviewCompanion
      jobId="speech-job"
      token="test-token"
      onBack={vi.fn()}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
  fireEvent.change(await screen.findByLabelText("Your answer"), {
    target: { value: "Typed introduction" },
  });
  await record();
  expect(
    (screen.getByLabelText("Interview round") as HTMLSelectElement).disabled
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Get feedback" }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
  fetchMock.mockResolvedValueOnce(reply({ text: "Spoken experience" }));
  fetchMock.mockResolvedValueOnce(
    reply({ error: "Evaluation unavailable" }, 502)
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Stop recording and send answer" })
  );
  await screen.findByText("Evaluation unavailable");
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(JSON.parse(fetchMock.mock.calls[2][1].body).answer).toBe(
    "Typed introduction\n\nSpoken experience"
  );
  expect(
    (screen.getByLabelText("Your answer") as HTMLTextAreaElement).value
  ).toBe("Typed introduction\n\nSpoken experience");
});
