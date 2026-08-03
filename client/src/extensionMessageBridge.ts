export const EXTENSION_MESSAGE_TYPE = "BEEHIRED_ANALYZE_JOB";

export type ExtensionJob = {
  source: "linkedin-extension";
  jobTitle: string;
  companyName: string;
  jobText: string;
};

type ExtensionMessage = {
  type: typeof EXTENSION_MESSAGE_TYPE;
  payload: ExtensionJob;
};

type MessageTarget = Pick<Window, "addEventListener" | "removeEventListener">;
type ExtensionJobSubscriber = (job: ExtensionJob) => void;

export function parseExtensionMessage(data: unknown): ExtensionJob | null {
  if (!data || typeof data !== "object") return null;

  const message = data as Partial<ExtensionMessage>;
  if (message.type !== EXTENSION_MESSAGE_TYPE) return null;
  if (!message.payload || typeof message.payload !== "object") return null;

  const payload = message.payload as Record<string, unknown>;
  if (
    payload.source !== "linkedin-extension" ||
    typeof payload.jobTitle !== "string" ||
    typeof payload.companyName !== "string" ||
    typeof payload.jobText !== "string" ||
    payload.jobText.trim().length === 0
  ) {
    return null;
  }

  return {
    source: payload.source,
    jobTitle: payload.jobTitle,
    companyName: payload.companyName,
    jobText: payload.jobText,
  };
}

export function createExtensionMessageBridge(
  target: MessageTarget,
  expectedOrigin: string,
  development = false
) {
  const subscribers = new Set<ExtensionJobSubscriber>();
  const pendingJobs: ExtensionJob[] = [];
  const receivedJobKeys = new Set<string>();

  function log(message: string, details?: unknown) {
    if (development) console.debug(`[BeeHired extension] ${message}`, details ?? "");
  }

  function receiveMessage(event: MessageEvent<unknown>) {
    if (event.origin !== expectedOrigin) {
      log("Ignored message from an unexpected origin", event.origin);
      return;
    }

    const job = parseExtensionMessage(event.data);
    if (!job) {
      if (
        event.data &&
        typeof event.data === "object" &&
        (event.data as Record<string, unknown>).type === EXTENSION_MESSAGE_TYPE
      ) {
        log("Ignored malformed analyze-job message", event.data);
      }
      return;
    }

    const jobKey = JSON.stringify(job);
    if (receivedJobKeys.has(jobKey)) {
      log("Ignored duplicate analyze-job message", job);
      return;
    }
    receivedJobKeys.add(jobKey);

    log("Received analyze-job message", {
      companyName: job.companyName,
      jobTitle: job.jobTitle,
      jobTextLength: job.jobText.length,
    });

    if (subscribers.size === 0) {
      pendingJobs.push(job);
      log("Buffered message until the application is ready");
      return;
    }

    subscribers.forEach((subscriber) => subscriber(job));
  }

  target.addEventListener("message", receiveMessage as EventListener);

  return {
    subscribe(subscriber: ExtensionJobSubscriber) {
      subscribers.add(subscriber);

      if (pendingJobs.length > 0) {
        log(`Delivering ${pendingJobs.length} buffered message(s)`);
        const jobsToDeliver = pendingJobs.splice(0);
        jobsToDeliver.forEach((job) => subscriber(job));
      }

      return () => subscribers.delete(subscriber);
    },
    destroy() {
      target.removeEventListener("message", receiveMessage as EventListener);
      subscribers.clear();
      pendingJobs.length = 0;
      receivedJobKeys.clear();
    },
  };
}
