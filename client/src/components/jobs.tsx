import { useState } from "react";
import { getScoreClass, type SavedAnalysis } from "../App";
import "./jobs.scss";
import DeleteIcon from "../assets/delete.svg?react";
import LikeIcon from "../assets/favorite.svg?react";
import SadBeeIcon from "../assets/sad_bee.svg?react";

// Create a JobsList component/page
export function JobsList({ onBack }: JobsListProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<SavedAnalysis[]>(() =>
    JSON.parse(localStorage.getItem("savedAnalyses") || "[]").sort(
      (a: SavedAnalysis, b: SavedAnalysis) => b.matchScore - a.matchScore
    )
  );

  const [pendingDeleteJob, setPendingDeleteJob] =
    useState<SavedAnalysis | null>(null);

  function confirmDelete() {
    if (!pendingDeleteJob) return;

    const updatedJobs = jobs.filter((job) => job.id !== pendingDeleteJob.id);

    setJobs(updatedJobs);
    localStorage.setItem("savedAnalyses", JSON.stringify(updatedJobs));
    setPendingDeleteJob(null);
  }

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
          {!(jobs.length > 0) && (
            <div className="noJobResults">
              <SadBeeIcon className="sadBee" />
              <p>
                The hive did not find any saved jobs, start checking your fit,
                the results will be saved here{" "}
              </p>
            </div>
          )}
          {jobs.map((job) => {
            const isOpen = openJobId === job.id;

            return (
              <div
                className={`scoreCard liftCard cardExtension ${getScoreClass(job.matchScore)}`}
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
                    <p>Estimated Salary: {job.estimatedSalary}</p>
                  </div>
                  <div className="settings">
                    <DeleteIcon
                      className="delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDeleteJob(job);
                      }}
                    />
                    <LikeIcon className="like" />
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
      {pendingDeleteJob && (
        <div className="modalOverlay" onClick={() => setPendingDeleteJob(null)}>
          <div
            className="confirmModal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Delete saved job?</h2>
            <p>
              Delete <b>{pendingDeleteJob.jobName}</b> at{" "}
              <b>{pendingDeleteJob.companyName}</b>?
            </p>
            <div className="yesNoButtons">
              <button onClick={confirmDelete}>Yes</button>
              <button onClick={() => setPendingDeleteJob(null)}>No</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

interface JobsListProps {
  onBack: () => void;
}
