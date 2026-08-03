import { describe, expect, it, vi } from "vitest";
import {
  createExtensionMessageBridge,
  parseExtensionMessage,
} from "./extensionMessageBridge";

const validMessage = {
  type: "BEEHIRED_ANALYZE_JOB",
  payload: {
    source: "linkedin-extension",
    jobTitle: "",
    companyName: "",
    jobText: "full description...",
  },
};

describe("parseExtensionMessage", () => {
  it("reads the extension's nested payload and permits missing metadata", () => {
    expect(parseExtensionMessage(validMessage)).toEqual(validMessage.payload);
  });

  it("rejects the old flat message shape", () => {
    expect(
      parseExtensionMessage({
        type: "BEEHIRED_ANALYZE_JOB",
        source: "linkedin-extension",
        jobTitle: "Engineer",
        companyName: "BeeHired",
        jobText: "description",
      })
    ).toBeNull();
  });

  it("requires a non-empty job description", () => {
    expect(
      parseExtensionMessage({
        ...validMessage,
        payload: { ...validMessage.payload, jobText: "   " },
      })
    ).toBeNull();
  });
});

describe("extension message bridge", () => {
  it("buffers messages sent before the application subscribes", () => {
    const target = new EventTarget();
    const bridge = createExtensionMessageBridge(
      target as unknown as Window,
      "https://beehired.example"
    );
    const subscriber = vi.fn();

    target.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://beehired.example",
        data: validMessage,
      })
    );
    expect(subscriber).not.toHaveBeenCalled();

    bridge.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveBeenCalledWith(validMessage.payload);
    bridge.destroy();
  });

  it("rejects other origins and suppresses duplicate submissions", () => {
    const target = new EventTarget();
    const bridge = createExtensionMessageBridge(
      target as unknown as Window,
      "https://beehired.example"
    );
    const subscriber = vi.fn();
    bridge.subscribe(subscriber);

    target.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://attacker.example",
        data: validMessage,
      })
    );
    target.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://beehired.example",
        data: validMessage,
      })
    );
    target.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://beehired.example",
        data: validMessage,
      })
    );

    expect(subscriber).toHaveBeenCalledOnce();
    bridge.destroy();
  });
});
