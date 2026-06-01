import { useState } from "react";
import { type SavedAnalysis } from "../App";
import "./jobs.scss";
import DeleteIcon from "../assets/delete.svg?react";
import LikeIcon from "../assets/favorite.svg?react";
import SadBeeIcon from "../assets/sad_bee.svg?react";
import { getScoreClass } from "../utils/scoreUtils";

const EMPTY_TEXT = "Not available";

function getText(value: string | null | undefined) {
  return value ?? EMPTY_TEXT;
}

function getScore(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function getList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

// Create a JobsList component/page
export function JobsList({ onBack }: JobsListProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<SavedAnalysis[]>(() =>
    JSON.parse(localStorage.getItem("savedAnalyses") || "[]").sort(
      (a: SavedAnalysis, b: SavedAnalysis) =>
        getScore(b.matchScore) - getScore(a.matchScore)
    )
  );

  function toggleLikedJob(jobId: string) {
    console.log("liked job", jobId);
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, liked: !(job.liked === true) } : job
    );

    setJobs(updatedJobs);
    localStorage.setItem("savedAnalyses", JSON.stringify(updatedJobs));
  }

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
            const score = getScore(job.matchScore);

            return (
              <div
                className={`scoreCard ${job.liked ? "likedCard" : ""} liftCard cardExtension ${getScoreClass(score)}`}
                key={job.id}
                onClick={() => setOpenJobId(isOpen ? null : job.id)}
              >
                <div className="jobSection">
                  <div className="score">{score}%</div>
                  <div className="jobOffer">
                    <h2>{getText(job.companyName)}</h2>
                    <h3>{getText(job.jobName)}</h3>
                    <p>
                      <b>{getText(job.verdict)}</b>
                    </p>
                    <p>
                      <b>Interview risk:</b> {getText(job.interviewRisk)}
                    </p>
                    <p>
                      <b>Estimated Salary:</b> {getText(job.estimatedSalary)}
                    </p>
                  </div>
                  <div className="settings">
                    <DeleteIcon
                      className="delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDeleteJob(job);
                      }}
                    />
                    <LikeIcon
                      className={`like ${job.liked ? "likedIcon" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleLikedJob(job.id);
                      }}
                    />
                  </div>
                </div>
                {isOpen && (
                  <section className="jobDetails">
                    <p>{getText(job.summary)}</p>

                    <h4>Strong Matches</h4>
                    <ul>
                      {getList(job.strongMatches).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Missing Skills</h4>
                    <ul>
                      {getList(job.missingSkills).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Red Flags</h4>
                    <ul>
                      {getList(job.redFlags).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Application Message</h4>
                    <p>{getText(job.applicationMessage)}</p>

                    <h4>Response strategy</h4>
                    <p>{getText(job.responseStrategy?.type)}</p>
                    <p>{getText(job.responseStrategy?.message)}</p>

                    <h4>Not Interested Message</h4>
                    <p>{getText(job.notInterestedMessage)}</p>
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
              Delete <b>{getText(pendingDeleteJob.jobName)}</b> at{" "}
              <b>{getText(pendingDeleteJob.companyName)}</b>?
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
