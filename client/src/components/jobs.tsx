import { useState } from "react";
import type { SavedAnalysis } from "../App";
import "./jobs.scss";

// Create a JobsList component/page
export function JobsList({ onBack }: JobsListProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const jobs: SavedAnalysis[] = JSON.parse(
    localStorage.getItem("savedAnalyses") || "[]"
  ).sort((a: SavedAnalysis, b: SavedAnalysis) => b.matchScore - a.matchScore);

  return (
    <main className="jobsPage">
      <div className="jobsListContent">
        <section className="jobsHeader">
          <button className="backArrow" onClick={onBack} aria-label="Back">
            ←
          </button>
          <h1>Saved Jobs</h1>
        </section>

        <section className="results">
          {jobs.map((job) => {
            const isOpen = openJobId === job.id;

            return (
              <div
                className="scoreCard liftCard cardExtension"
                key={job.id}
                onClick={() => setOpenJobId(isOpen ? null : job.id)}
              >
                <div className="jobSection">
                  <div className="score">{job.matchScore}%</div>
                  <div className="jobOffer">
                    <h2>{job.companyName}</h2>
                    <h3>{job.jobName}</h3>
                    <p>{job.verdict}</p>
                    <p>Interview risk: {job.interviewRisk}</p>
                  </div>
                </div>
                {isOpen && (
                  <section className="jobDetails">
                    <p>{job.summary}</p>

                    <h4>Strong Matches</h4>
                    <ul>
                      {job.strongMatches.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Missing Skills</h4>
                    <ul>
                      {job.missingSkills.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Red Flags</h4>
                    <ul>
                      {job.redFlags.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Application Message</h4>
                    <p>{job.applicationMessage}</p>
                  </section>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

interface JobsListProps {
  onBack: () => void;
}
