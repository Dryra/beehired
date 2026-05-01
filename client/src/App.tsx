import { useState, useEffect, useRef } from "react";
import "./App.scss";
import { JobsList } from "./components/jobs";
import honeycombIcon from "./assets/icon-honeycomb.svg";

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
      headers: { "Content-Type": "application/json" },
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
                <img
                  className="jobsList"
                  src={honeycombIcon}
                  alt="My Jobs List"
                />
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
                    <p>Interview risk: {analysis.interviewRisk}</p>
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

function getScoreClass(score: number) {
  if (score >= 80) return "scoreHigh";
  if (score >= 65) return "scoreMedium";
  return "scoreLow";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Strong fit";
  if (score >= 65) return "Potential fit";
  return "Risky fit";
}
export default App;
