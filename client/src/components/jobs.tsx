import { useState } from "react";
import { type SavedAnalysis } from "../App";
import "./jobs.scss";
import DeleteIcon from "../assets/delete.svg?react";
import LikeIcon from "../assets/favorite.svg?react";
import SadBeeIcon from "../assets/sad_bee.svg?react";
import { getScoreClass } from "../utils/scoreUtils";

const EMPTY_TEXT = "Not available";
type JobsView = "details" | "tracker";
type ApplicationStatus = NonNullable<SavedAnalysis["applicationStatus"]>;

function getText(value: string | null | undefined) {
  return value ?? EMPTY_TEXT;
}

function getScore(value: number | null | undefined) {
  return typeof value === "number" ? value : 0;
}

function getList(value: string[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function getJobLinkHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

// Create a JobsList component/page
export function JobsList({ onBack }: JobsListProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<JobsView>("details");
  const [editingLinkJobId, setEditingLinkJobId] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});

  const [jobs, setJobs] = useState<SavedAnalysis[]>(() =>
    JSON.parse(localStorage.getItem("savedAnalyses") || "[]").sort(
      (a: SavedAnalysis, b: SavedAnalysis) =>
        getScore(b.matchScore) - getScore(a.matchScore)
    )
  );

  function toggleLikedJob(jobId: string) {
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, liked: !(job.liked === true) } : job
    );

    setJobs(updatedJobs);
    localStorage.setItem("savedAnalyses", JSON.stringify(updatedJobs));
  }

  function updateApplication(
    jobId: string,
    changes: Pick<SavedAnalysis, "applicationStatus" | "applicationNote">
  ) {
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, ...changes } : job
    );

    setJobs(updatedJobs);
    localStorage.setItem("savedAnalyses", JSON.stringify(updatedJobs));
  }

  function startEditingLink(job: SavedAnalysis) {
    setLinkDrafts((drafts) => ({ ...drafts, [job.id]: job.jobLink ?? "" }));
    setEditingLinkJobId(job.id);
  }

  function saveJobLink(job: SavedAnalysis) {
    const jobLink = (linkDrafts[job.id] ?? "").trim();
    const updatedJobs = jobs.map((savedJob) =>
      savedJob.id === job.id ? { ...savedJob, jobLink } : savedJob
    );

    setJobs(updatedJobs);
    localStorage.setItem("savedAnalyses", JSON.stringify(updatedJobs));
    setEditingLinkJobId(null);
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
          <div className="viewSwitcher" aria-label="Saved jobs view">
            <button
              className={activeView === "details" ? "active" : ""}
              onClick={() => setActiveView("details")}
              aria-pressed={activeView === "details"}
            >
              Job list
            </button>
            <button
              className={activeView === "tracker" ? "active" : ""}
              onClick={() => setActiveView("tracker")}
              aria-pressed={activeView === "tracker"}
            >
              Application tracker
            </button>
          </div>
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
          {activeView === "details" && jobs.map((job) => {
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
          {activeView === "tracker" && jobs.length > 0 && (
            <div className="trackerTableWrapper">
              <table className="trackerTable">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Job</th>
                    <th>Job link</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className={
                        job.applicationStatus
                          ? `status-${job.applicationStatus}`
                          : undefined
                      }
                    >
                      <td data-label="Company">{getText(job.companyName)}</td>
                      <td data-label="Job">{getText(job.jobName)}</td>
                      <td data-label="Job link">
                        {editingLinkJobId === job.id || !job.jobLink ? (
                          <div className="linkEditor">
                            <input
                              type="url"
                              value={linkDrafts[job.id] ?? job.jobLink ?? ""}
                              onChange={(event) =>
                                setLinkDrafts((drafts) => ({
                                  ...drafts,
                                  [job.id]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveJobLink(job);
                              }}
                              placeholder="https://example.com/job"
                              aria-label={`Job link for ${getText(job.jobName)}`}
                            />
                            <button type="button" onClick={() => saveJobLink(job)}>
                              Save
                            </button>
                            {job.jobLink && (
                              <button
                                type="button"
                                className="secondaryLinkAction"
                                onClick={() => setEditingLinkJobId(null)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="savedJobLink">
                            <a
                              href={getJobLinkHref(job.jobLink)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open job
                            </a>
                            <button type="button" onClick={() => startEditingLink(job)}>
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td data-label="Status">
                        <select
                          value={job.applicationStatus ?? ""}
                          onChange={(event) =>
                            updateApplication(job.id, {
                              applicationStatus: event.target.value as ApplicationStatus,
                              applicationNote: job.applicationNote,
                            })
                          }
                          aria-label={`Application status for ${getText(job.jobName)}`}
                        >
                          <option value="" disabled>Select status</option>
                          <option value="applied">Applied</option>
                          <option value="in-progress">In progress</option>
                          <option value="rejected">Rejected</option>
                          <option value="offer">Offer</option>
                        </select>
                      </td>
                      <td data-label="Note">
                        <input
                          type="text"
                          value={job.applicationNote ?? ""}
                          onChange={(event) =>
                            updateApplication(job.id, {
                              applicationStatus: job.applicationStatus,
                              applicationNote: event.target.value,
                            })
                          }
                          placeholder="Optional note"
                          aria-label={`Note for ${getText(job.jobName)}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
