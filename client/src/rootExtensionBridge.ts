import {
  createExtensionMessageBridge,
  type ExtensionJob,
} from "./extensionMessageBridge";

type Unsubscribe = () => void;

let rootBridge: ReturnType<typeof createExtensionMessageBridge> | null = null;

export function installRootExtensionBridge() {
  if (!rootBridge) {
    rootBridge = createExtensionMessageBridge(
      window,
      window.location.origin,
      import.meta.env.DEV
    );
  }
}

export function subscribeToExtensionJobs(
  subscriber: (job: ExtensionJob) => void
): Unsubscribe {
  installRootExtensionBridge();
  return rootBridge!.subscribe(subscriber);
}
