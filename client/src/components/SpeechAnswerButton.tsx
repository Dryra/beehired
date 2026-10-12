import { useEffect, useRef, useState } from "react";
import { API_URL } from "../api";

type Phase = "idle" | "permission" | "recording" | "transcribing";
type Recording = {
  recorder?: MediaRecorder;
  stream?: MediaStream;
  timer?: number;
  controller: AbortController;
};
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

function release(recording: Recording) {
  window.clearTimeout(recording.timer);
  recording.stream?.getTracks().forEach((track) => track.stop());
}

function dispose(recording: Recording) {
  recording.controller.abort();
  if (recording.recorder) {
    recording.recorder.onstop = null;
    recording.recorder.ondataavailable = null;
    recording.recorder.onerror = null;
    if (recording.recorder.state !== "inactive") recording.recorder.stop();
  }
  release(recording);
}

export function SpeechAnswerButton({
  token,
  disabled,
  onActivityChange,
  onTranscript,
}: {
  token: string | null;
  disabled: boolean;
  onActivityChange: (active: boolean) => void;
  onTranscript: (text: string) => void | Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const active = useRef<Recording | null>(null);

  useEffect(
    () => () => {
      const recording = active.current;
      active.current = null;
      if (recording) dispose(recording);
    },
    []
  );

  function finish(recording: Recording) {
    if (active.current !== recording) return;
    active.current = null;
    dispose(recording);
    setPhase("idle");
    onActivityChange(false);
  }

  async function transcribe(
    recording: Recording,
    chunks: Blob[],
    mimeType: string
  ) {
    release(recording);
    if (active.current !== recording) return;
    setPhase("transcribing");
    try {
      const audio = new Blob(chunks, { type: mimeType });
      if (!audio.size)
        throw new Error("No audio was recorded. Please try again.");
      if (audio.size > MAX_AUDIO_BYTES)
        throw new Error(
          "Recording is too large. Please record a shorter answer."
        );
      const form = new FormData();
      form.append(
        "audio",
        audio,
        mimeType.startsWith("audio/mp4") ? "answer.mp4" : "answer.webm"
      );
      recording.timer = window.setTimeout(
        () => recording.controller.abort(),
        100000
      );
      const response = await fetch(`${API_URL}/api/transcribe`, {
        method: "POST",
        body: form,
        headers: token ? { "x-demo-token": token } : {},
        signal: recording.controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not transcribe the recording.");
      if (typeof data.text !== "string" || !data.text.trim())
        throw new Error("No speech was recognized. Please try again.");
      if (active.current !== recording || recording.controller.signal.aborted)
        return;
      // End recording activity before adding the transcript to the editable draft.
      finish(recording);
      await onTranscript(data.text.trim());
    } catch (err) {
      if (active.current !== recording) return;
      setError(
        err instanceof Error && err.name !== "AbortError"
          ? err.message
          : "Transcription timed out. Please record again."
      );
    } finally {
      finish(recording);
    }
  }

  function stopAndTranscribe() {
    const recording = active.current;
    if (recording?.recorder?.state === "recording") {
      setPhase("transcribing");
      recording.recorder.stop();
      release(recording);
    }
  }

  async function start() {
    if (disabled || !token || active.current) return;
    setError("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Microphone recording is unavailable. Use a supported browser on HTTPS or localhost, or type your answer."
      );
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
      (type) => MediaRecorder.isTypeSupported(type)
    );
    if (!mimeType) {
      setError(
        "This browser cannot record a supported audio format. Please type your answer."
      );
      return;
    }
    const recording: Recording = { controller: new AbortController() };
    active.current = recording;
    setPhase("permission");
    onActivityChange(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (active.current !== recording) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recording.stream = stream;
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      recording.recorder = recorder;
      const chunks: Blob[] = [];
      let bytes = 0;
      recorder.ondataavailable = (event) => {
        if (active.current !== recording) return;
        chunks.push(event.data);
        bytes += event.data.size;
        if (bytes > MAX_AUDIO_BYTES) {
          setError("Recording is too large. Please record a shorter answer.");
          finish(recording);
        }
      };
      recorder.onerror = () => {
        if (active.current !== recording) return;
        setError(
          "Recording was interrupted. Please try again or type your answer."
        );
        finish(recording);
      };
      recorder.onstop = () =>
        void transcribe(recording, chunks, recorder.mimeType || mimeType);
      recorder.start(1000);
      setPhase("recording");
      recording.timer = window.setTimeout(stopAndTranscribe, 5 * 60 * 1000);
    } catch (err) {
      if (active.current !== recording) return;
      setError(
        (err instanceof Error || err instanceof DOMException) &&
          err.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser or type your answer."
          : "Could not access your microphone. Check that it is connected and available."
      );
      finish(recording);
    }
  }

  return (
    <div className="speechAnswer">
      <div className="speechControls">
        <button
          type="button"
          className={`speechMic ${phase === "recording" ? "isRecording" : ""}`}
          disabled={
            disabled ||
            !token ||
            phase === "permission" ||
            phase === "transcribing"
          }
          onClick={
            phase === "recording" ? stopAndTranscribe : () => void start()
          }
          aria-label={
            phase === "recording"
              ? "Stop recording and transcribe"
              : "Record spoken answer"
          }
          aria-pressed={phase === "recording"}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
          </svg>
          {phase === "recording"
            ? "Stop & transcribe"
            : phase === "permission"
              ? "Allow microphone…"
              : phase === "transcribing"
                ? "Transcribing…"
                : "Speak"}
        </button>
        {phase !== "idle" && (
          <button
            type="button"
            onClick={() => {
              if (active.current) finish(active.current);
            }}
          >
            Cancel
          </button>
        )}
      </div>
      <small role="status">
        {phase === "recording"
          ? "Recording… Stop & transcribe when ready. Automatically stops after 5 minutes."
          : phase === "transcribing"
            ? "Turning your speech into an answer…"
            : "Speak, then Stop & transcribe. Review and edit your answer before clicking Get feedback."}
      </small>
      {error && (
        <p className="interviewError" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
