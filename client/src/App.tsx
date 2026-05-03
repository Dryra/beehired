import { useState, useEffect, useRef } from "react";
import "./App.scss";
import { JobsList } from "./components/jobs";
import HoneycombIcon from "./assets/icon-honeycomb.svg?react";
import { getScoreClass, getScoreLabel } from "./utils/scoreUtils";

type Analysis = {
  matchScore: number;
  verdict: string;
  summary: string;
  strongMatches: string[];
  missingSkills: string[];
  redFlags: string[];
  whatToEmphasize: string[];
  applicationMessage: string;
  companyName: string;
  jobName: string;
  interviewRisk: "Low" | "Medium" | "High";
  estimatedSalary: string;
};

// Add near your other types
export type SavedAnalysis = Analysis & {
  id: string;
  savedAt: string;
};

const API_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3001";

function App() {
  const [cv, setCv] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);

  const [cvText, setCvText] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);

  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);
  const lastAnalysisDataRef = useRef<string | null>(null);

  const [showJobs, setShowJobs] = useState(false);

  const [demoToken, setDemoToken] = useState<string | null>(null);

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [emailCopied, setEmailCopied] = useState(false);

  const linkedInUrl = "https://www.linkedin.com/in/ahmeddrira/";
  const contactEmail = "dryraa@gmail.com";

  function showJobsList() {
    setShowJobs(true);
  }

  function hideJobsList() {
    setShowJobs(false);
  }

  const saveAnalysis = (analysis: Analysis) => {
    if (!analysis) return;

    const savedJobs: SavedAnalysis[] = JSON.parse(
      localStorage.getItem("savedAnalyses") || "[]"
    );

    const newSavedAnalysis: SavedAnalysis = {
      ...analysis,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };

    const updatedJobs = [...savedJobs, newSavedAnalysis].sort(
      (a, b) => b.matchScore - a.matchScore
    );

    localStorage.setItem("savedAnalyses", JSON.stringify(updatedJobs));
  };

  async function copyContactEmail() {
    await navigator.clipboard.writeText(contactEmail);
    setEmailCopied(true);

    setTimeout(() => setEmailCopied(false), 1600);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setDemoToken(token);
      // clean up url
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  useEffect(() => {
    if (!analysis) return;

    const currentAnalysisData = JSON.stringify(analysis);

    if (lastAnalysisDataRef.current === currentAnalysisData) return;

    lastAnalysisDataRef.current = currentAnalysisData;

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    saveAnalysis(analysis);
  }, [analysis]);

  // PDF upload
  async function handlePdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cv", file);

    try {
      setIsParsingPdf(true);

      const response = await fetch(`${API_URL}/api/parse-cv`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse PDF");
      }

      setCvText(data.text);
      setCv(data.text);
    } catch (error) {
      console.error(error);
      alert("Could not read PDF");
    } finally {
      setIsParsingPdf(false);
    }
  }

  async function analyze() {
    setLoading(true);
    setAnalysis(null);

    const res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(demoToken ? { "x-demo-token": demoToken } : {}),
      },
      body: JSON.stringify({ cv, jobDescription }),
    });

    const data = await res.json();
    console.log("### data", data);
    setAnalysis(data);
    setLoading(false);
  }

  async function copyApplicationMessage() {
    if (!analysis?.applicationMessage) return;

    await navigator.clipboard.writeText(analysis.applicationMessage);
    setCopied(true);

    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <main className="app">
        <div className="honeycombBg" />
        {!showJobs && (
          <div className="analyzeSection">
            <section className="links">
              <div className="jobsListButton" onClick={showJobsList}>
                <HoneycombIcon className="jobsList" />
              </div>
            </section>
            <section className="hero">
              <h1 className="header">
                <div className="bee-header">🐝</div> BeeHired
              </h1>
              <p className="tagline">The Bee that gets you in the Beesnees.</p>
              <p className="subtitle">
                Paste your CV or upload a PDF and a job description to get an
                instant match score, missing skills, red flags, and a tailored
                application message.
              </p>
            </section>

            <section className="inputGrid">
              <div className="panel">
                <h2>Your CV</h2>
                <label className="uploadBox">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                  />
                  {isParsingPdf
                    ? "The hive is reading the pdf..."
                    : "Upload CV PDF"}
                </label>
                <textarea
                  placeholder="Paste your CV here..."
                  value={cvText || cv}
                  onChange={(e) => {
                    setCvText("");
                    setCv(e.target.value);
                  }}
                />
              </div>

              <div className="panel">
                <h2>Job Description</h2>
                <textarea
                  placeholder="Paste the job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
            </section>

            <div className="actionRow">
              <button
                className={`analyzeButton ${loading ? "isLoading" : ""}`}
                onClick={analyze}
                disabled={loading || !cv || !jobDescription}
              >
                {loading && <span className="spinner" />}
                <span>
                  {loading ? "The hive is finding your fit..." : "Check my fit"}
                </span>
              </button>
            </div>

            {analysis && (
              <section className="results" ref={resultsRef}>
                <h2 className="companyName">{analysis.companyName}</h2>
                <h3 className="companyName">{analysis.jobName}</h3>
                <div
                  className={`scoreCard liftCard ${getScoreClass(analysis.matchScore)}`}
                >
                  <AnimatedScore score={analysis.matchScore} />

                  <div>
                    <span className="statusPill">
                      {getScoreLabel(analysis.matchScore)}
                    </span>
                    <h2>{analysis.verdict}</h2>
                    <p>
                      <b>Interview risk:</b> {analysis.interviewRisk}
                    </p>
                    <p>
                      <b>Estimated Salary:</b> {analysis.estimatedSalary} (This
                      is an estimation and could be wrong)
                    </p>
                  </div>
                </div>

                <p className="summary">{analysis.summary}</p>

                <div className="resultGrid">
                  <ResultCard
                    title="Strong Matches"
                    items={analysis.strongMatches}
                  />
                  <ResultCard
                    title="Missing Skills"
                    items={analysis.missingSkills}
                  />
                  <ResultCard title="Red Flags" items={analysis.redFlags} />
                  <ResultCard
                    title="What to Emphasize"
                    items={analysis.whatToEmphasize}
                  />
                </div>

                <div className="messageBox liftCard">
                  <div className="messageHeader">
                    <h3>Application Message</h3>
                    <button
                      className="copyButton"
                      onClick={copyApplicationMessage}
                    >
                      {copied ? "Copied!" : "Copy message"}
                    </button>
                  </div>

                  <p>{analysis.applicationMessage}</p>
                </div>
              </section>
            )}
          </div>
        )}

        {showJobs && <JobsList onBack={hideJobsList} />}
        {showDemoBanner && (
          <div className="demoBanner">
            {demoToken ? (
              <span>
                AI Mode Enabled: showcasing capabilities with real AI output.
              </span>
            ) : (
              <>
                <span>
                  Demo mode enabled: showcasing capabilities with sample output.
                </span>
                <button type="button" onClick={() => setShowDemoModal(true)}>
                  Request AI Access
                </button>
              </>
            )}

            <button
              className="demoBannerClose"
              type="button"
              aria-label="Close demo mode banner"
              onClick={() => setShowDemoBanner(false)}
            >
              ×
            </button>
          </div>
        )}

        {showDemoModal && (
          <div className="modalBackdrop" role="presentation">
            <section
              className="demoModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-modal-title"
            >
              <button
                className="modalClose"
                type="button"
                aria-label="Close modal"
                onClick={() => setShowDemoModal(false)}
              >
                ×
              </button>

              <h2 id="demo-modal-title">Request full AI access</h2>
              <p>
                The public version runs in demo mode to protect API usage. For a
                live AI-powered demo, contact me and I’ll provide access.
              </p>

              <div className="modalActions">
                <a href={linkedInUrl} target="_blank" rel="noreferrer">
                  Contact on LinkedIn
                </a>
                <button type="button" onClick={copyContactEmail}>
                  {emailCopied ? "Email copied" : "Copy email"}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function AnimatedScore({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let frame: number;
    let current = 0;
    const duration = 900;
    const start = performance.now();

    function animate(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      current = Math.round(score * eased);
      setDisplayScore(current);

      if (progress < 1) frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return <div className="score">{displayScore}%</div>;
}

function ResultCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="resultCard liftCard">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
