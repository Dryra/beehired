import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { SavedAnalysis } from "../App";
import { API_URL } from "../api";
import type {
  CodeLanguage,
  Difficulty,
  InterviewFeedback,
  InterviewQuestion,
  InterviewResponse,
  InterviewTurn,
  Round,
} from "../interviewTypes";
import "./interview.scss";

const CodeEditor = lazy(() => import("./InterviewCodeEditor"));
const ROUNDS: Record<
  Round,
  { label: string; description: string; tip: string }
> = {
  intro: {
    label: "1st round · Introductory interview",
    description:
      "Practice your introduction, motivation, and fit for the role.",
    tip: "Connect your experience to the role. Keep your introduction focused and use concrete examples.",
  },
  technical: {
    label: "2nd round · Technical interview",
    description:
      "Work through role-specific technical questions and coding exercises.",
    tip: "Explain your assumptions and trade-offs. For coding questions, consider edge cases and complexity.",
  },
  "soft-skills": {
    label: "3rd round · Soft skills interview",
    description:
      "Build stronger answers about teamwork, communication, and ownership.",
    tip: "Use STAR: situation, task, action, result. Be specific about your own contribution.",
  },
};
type Session = {
  question: InterviewQuestion | null;
  nextQuestion: InterviewQuestion | null;
  feedback: InterviewFeedback | null;
  turns: InterviewTurn[];
  answer: string;
  language: CodeLanguage;
  started: boolean;
};
const emptySession = (): Session => ({
  question: null,
  nextQuestion: null,
  feedback: null,
  turns: [],
  answer: "",
  language: "plaintext",
  started: false,
});

export function InterviewCompanion({
  jobId,
  token,
  onBack,
}: {
  jobId: string;
  token: string | null;
  onBack: () => void;
}) {
  const [job] = useState<SavedAnalysis | undefined>(() => {
    try {
      const jobs = JSON.parse(localStorage.getItem("savedAnalyses") || "[]");
      return Array.isArray(jobs)
        ? jobs.find((item: SavedAnalysis) => item.id === jobId)
        : undefined;
    } catch {
      return undefined;
    }
  });
  const [description, setDescription] = useState(job?.jobDescription || "");
  const [round, setRound] = useState<Round>("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const sessionKey = `${round}:${difficulty}`;
  const session = sessions[sessionKey] || emptySession();
  const config = ROUNDS[round];
  const finished =
    session.started && !!session.feedback && !session.nextQuestion;
  const hasStarted = Object.values(sessions).some((value) => value.started);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    questionHeading.current?.focus();
  }, [session.question]);

  function updateSession(changes: Partial<Session>) {
    setSessions((current) => ({
      ...current,
      [sessionKey]: { ...(current[sessionKey] || emptySession()), ...changes },
    }));
  }

  async function requestTurn() {
    if (!job || controller.current || !description.trim()) return;
    const abortController = new AbortController();
    controller.current = abortController;
    const timeout = window.setTimeout(() => abortController.abort(), 100000);
    setBusy(true);
    setError("");
    try {
      // Read the latest list so editing a description never overwrites other job changes.
      const savedJobs: SavedAnalysis[] = JSON.parse(
        localStorage.getItem("savedAnalyses") || "[]"
      );
      localStorage.setItem(
        "savedAnalyses",
        JSON.stringify(
          savedJobs.map((saved) =>
            saved.id === jobId
              ? { ...saved, jobDescription: description.trim() }
              : saved
          )
        )
      );
      const response = await fetch(`${API_URL}/api/interview/turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-demo-token": token } : {}),
        },
        signal: abortController.signal,
        body: JSON.stringify({
          job: {
            companyName: job.companyName || "",
            jobName: job.jobName || "",
            description: description.trim(),
            cv: localStorage.getItem("savedCv") || "",
          },
          round,
          difficulty,
          history: session.turns,
          question: session.question,
          answer: session.question ? session.answer : "",
          language: session.language,
        }),
      });
      const data: InterviewResponse & { error?: string } =
        await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Could not reach the interview assistant."
        );
      if (session.question && data.feedback) {
        updateSession({
          feedback: data.feedback,
          nextQuestion: data.question,
          turns: [
            ...session.turns,
            {
              question: session.question,
              answer: session.answer,
              language: session.language,
              feedback: data.feedback,
            },
          ],
        });
      } else if (!session.question && data.question) {
        updateSession({
          started: true,
          question: data.question,
          answer: data.question.starterCode,
          language: data.question.language,
        });
      } else {
        throw new Error(
          "The assistant returned an incomplete response. Please try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error && err.name !== "AbortError"
          ? err.message
          : "The request timed out. Your answer is still here; please try again."
      );
    } finally {
      window.clearTimeout(timeout);
      controller.current = null;
      setBusy(false);
    }
  }

  function nextQuestion() {
    if (!session.nextQuestion) return;
    updateSession({
      question: session.nextQuestion,
      nextQuestion: null,
      feedback: null,
      answer: session.nextQuestion.starterCode,
      language: session.nextQuestion.language,
    });
  }

  if (!job || job.applicationStatus !== "in-progress")
    return (
      <main className="interviewPage">
        <button onClick={onBack}>← Saved jobs</button>
        <h1>Interview companion</h1>
        <p>
          {job
            ? "Set this job's status to In progress in the application tracker to practice."
            : "This saved job could not be found."}
        </p>
      </main>
    );

  return (
    <main className={`interviewPage interview-${round}`}>
      <header className="interviewHeader">
        <button className="interviewBack" onClick={onBack}>
          ← Saved jobs
        </button>
        <p className="interviewEyebrow">YOUR NEXT STEP</p>
        <h1>
          Interview companion <span aria-hidden="true">✦</span>
        </h1>
        <p>
          {job.jobName} <span className="interviewMuted">at</span>{" "}
          {job.companyName}
        </p>
      </header>
      <div className="interviewLayout">
        <aside className="interviewSettings">
          <label htmlFor="interview-round">Interview round</label>
          <select
            id="interview-round"
            value={round}
            disabled={busy}
            onChange={(e) => {
              setRound(e.target.value as Round);
              setError("");
            }}
          >
            {Object.entries(ROUNDS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
          <label htmlFor="interview-difficulty">Difficulty</label>
          <select
            id="interview-difficulty"
            value={difficulty}
            disabled={busy}
            onChange={(e) => {
              setDifficulty(e.target.value as Difficulty);
              setError("");
            }}
          >
            <option value="easy">Easy · Build confidence</option>
            <option value="medium">Medium · Interview ready</option>
            <option value="hard">Hard · Push yourself</option>
          </select>
          <p>{config.description}</p>
          <div className="interviewTip">
            <h2>Before you answer</h2>
            <p>{config.tip}</p>
          </div>
          <p className="interviewMuted">
            10 questions per session. Round and difficulty each have their own
            practice session. Sessions stay available while this page is open.
          </p>
          <details open={!description.trim()}>
            <summary>Job description</summary>
            <label htmlFor="interview-description">
              {job.jobDescription
                ? "Saved job description"
                : "Add the original description for this saved job"}
            </label>
            <textarea
              id="interview-description"
              value={description}
              maxLength={30000}
              disabled={busy || hasStarted}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the role, responsibilities, and requirements…"
            />
            <small>
              Saved with this job when you start. Your saved CV is also used to
              tailor the questions.
            </small>
          </details>
        </aside>
        <section
          className="interviewWorkspace"
          aria-label="Interview practice"
          aria-busy={busy}
        >
          {!token && (
            <p className="interviewNotice">
              Live AI access is required. Open your access link with a valid
              token to practice.
            </p>
          )}
          {!session.started && (
            <div className="interviewWelcome">
              <span className="interviewSpark" aria-hidden="true">
                ✦
              </span>
              <h2>{config.label}</h2>
              <p>
                {config.description} Answer one question at a time, receive
                specific feedback, and try a follow-up.
              </p>
              <button
                className="interviewPrimary"
                disabled={busy || !token || !description.trim()}
                onClick={() => void requestTurn()}
              >
                {busy ? "Preparing your first question…" : "Start practice"}
              </button>
            </div>
          )}
          {session.question && (
            <article className="interviewQuestion">
              <div className="interviewQuestionMeta">
                <span>
                  Question{" "}
                  {Math.min(
                    session.turns.length + (session.feedback ? 0 : 1),
                    10
                  )}{" "}
                  / 10
                </span>
                <span>
                  {session.question.type === "coding"
                    ? "Coding exercise"
                    : session.question.type === "behavioral"
                      ? "Soft skills"
                      : session.question.type === "technical"
                        ? "Technical question"
                        : "Getting to know you"}
                </span>
              </div>
              <h2 ref={questionHeading} tabIndex={-1}>
                {session.question.focus}
              </h2>
              <p className="interviewPrompt">{session.question.prompt}</p>
              {!session.feedback && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void requestTurn();
                  }}
                >
                  {session.question.type === "coding" ? (
                    <>
                      <label htmlFor="code-language">Answer language</label>
                      <select
                        id="code-language"
                        value={session.language}
                        disabled={busy}
                        onChange={(e) =>
                          updateSession({
                            language: e.target.value as CodeLanguage,
                          })
                        }
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="sql">SQL</option>
                        <option value="cpp">C++</option>
                        <option value="plaintext">Other / plain text</option>
                      </select>
                      <Suspense fallback={<p>Loading code editor…</p>}>
                        <CodeEditor
                          value={session.answer}
                          language={session.language}
                          disabled={busy}
                          onChange={(answer) => updateSession({ answer })}
                        />
                      </Suspense>
                      <small>
                        Code is reviewed by the assistant, not executed. Add
                        comments to explain your approach. Use Escape, then Tab
                        to leave the editor.
                      </small>
                    </>
                  ) : (
                    <>
                      <label htmlFor="interview-answer">Your answer</label>
                      <textarea
                        id="interview-answer"
                        value={session.answer}
                        maxLength={20000}
                        disabled={busy}
                        onChange={(e) =>
                          updateSession({ answer: e.target.value })
                        }
                        placeholder={
                          round === "soft-skills"
                            ? "Describe the situation, your actions, and the outcome…"
                            : "Talk through your answer…"
                        }
                      />
                    </>
                  )}
                  <div className="interviewAnswerActions">
                    <small>
                      {session.answer.length.toLocaleString()} / 20,000
                      characters
                    </small>
                    <button
                      className="interviewPrimary"
                      type="submit"
                      disabled={
                        busy ||
                        !session.answer.trim() ||
                        session.answer.length > 20000
                      }
                    >
                      {busy ? "Reviewing your answer…" : "Get feedback"}
                    </button>
                  </div>
                </form>
              )}
            </article>
          )}
          {session.feedback && (
            <section className="interviewFeedback" aria-live="polite">
              <div className="interviewFeedbackTitle">
                <h2>Your feedback</h2>
                <span>
                  {session.feedback.score}
                  <small> / 10</small>
                </span>
              </div>
              <p>{session.feedback.summary}</p>
              <div className="interviewFeedbackGrid">
                <div>
                  <h3>What worked</h3>
                  <ul>
                    {session.feedback.strengths.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>What to improve</h3>
                  <ul>
                    {session.feedback.improvements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <details>
                <summary>Review your answer</summary>
                <pre>{session.answer}</pre>
              </details>
              <details>
                <summary>Example of a stronger answer</summary>
                <pre>{session.feedback.exampleAnswer}</pre>
              </details>
              {finished ? (
                <div className="interviewComplete">
                  <h3>Practice complete</h3>
                  <p>
                    You answered {session.turns.length} questions. Average
                    feedback score:{" "}
                    {(
                      session.turns.reduce(
                        (sum, turn) => sum + turn.feedback.score,
                        0
                      ) / session.turns.length
                    ).toFixed(1)}{" "}
                    / 10.
                  </p>
                  <button onClick={() => updateSession(emptySession())}>
                    Start a fresh session
                  </button>
                </div>
              ) : (
                <button className="interviewPrimary" onClick={nextQuestion}>
                  Next question →
                </button>
              )}
            </section>
          )}
          {error && (
            <p className="interviewError" role="alert">
              {error}
            </p>
          )}
          {session.turns.length > 0 && (
            <details className="interviewHistory">
              <summary>
                Session review · {session.turns.length} answered
              </summary>
              {session.turns.map((turn, i) => (
                <article key={i}>
                  <h3>
                    {i + 1}. {turn.question.focus} · {turn.feedback.score}/10
                  </h3>
                  <p>{turn.question.prompt}</p>
                  <details>
                    <summary>Your answer and feedback</summary>
                    <pre>{turn.answer}</pre>
                    <p>{turn.feedback.summary}</p>
                    <ul>
                      {turn.feedback.improvements.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                    <pre>{turn.feedback.exampleAnswer}</pre>
                  </details>
                </article>
              ))}
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
