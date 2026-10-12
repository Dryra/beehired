import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import {
  createTranscriptionRouter,
  MAX_AUDIO_BYTES,
} from "../src/routes/transcriptionRoutes";

test("transcription endpoint checks access, uploads, limits, provider errors and empty speech", async () => {
  let called = 0;
  let result = " My spoken answer. ";
  let fail = false;
  const app = express();
  app.use(
    "/api",
    createTranscriptionRouter({
      canUseAI: (token) => token === "test-token",
      transcribe: async (audio) => {
        called++;
        assert.equal(audio.filename, "answer.webm");
        assert.equal(audio.mimeType, "audio/webm");
        assert.ok(audio.buffer.length > 0);
        if (fail) throw new Error("private provider error");
        return result;
      },
    })
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  async function post({
    token = "test-token",
    type = "audio/webm",
    size = 8,
    include = true,
  } = {}) {
    const form = new FormData();
    if (include)
      form.append(
        "audio",
        new Blob([new Uint8Array(size)], { type }),
        "untrusted-filename.webm"
      );
    return fetch(`http://127.0.0.1:${address.port}/api/transcribe`, {
      method: "POST",
      headers: { "x-demo-token": token },
      body: form,
    });
  }
  try {
    assert.equal((await post({ token: "wrong" })).status, 403);
    assert.equal((await post({ include: false })).status, 400);
    assert.equal((await post({ size: 0 })).status, 400);
    assert.equal((await post({ type: "text/plain" })).status, 415);
    assert.equal((await post({ size: MAX_AUDIO_BYTES + 1 })).status, 413);
    assert.equal(called, 0);
    const success = await post();
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { text: "My spoken answer." });
    result = " ";
    assert.equal((await post()).status, 422);
    fail = true;
    const failure = await post();
    assert.equal(failure.status, 502);
    assert.ok(
      !JSON.stringify(await failure.json()).includes("private provider error")
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
});
