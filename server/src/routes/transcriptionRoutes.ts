import { Router } from "express";
import multer from "multer";

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const audioFormats: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export function createTranscriptionRouter(options: {
  canUseAI: (token: string | string[] | undefined) => boolean;
  transcribe: (audio: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }) => Promise<string>;
}) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 0, parts: 2 },
  }).single("audio");

  router.post("/transcribe", (req, res) => {
    if (!options.canUseAI(req.headers["x-demo-token"])) {
      return res
        .status(403)
        .json({
          error:
            "Speech transcription requires live AI access and demo mode disabled.",
        });
    }
    upload(req, res, async (error: unknown) => {
      if (error) {
        const tooLarge =
          error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE";
        return res
          .status(tooLarge ? 413 : 400)
          .json({
            error: tooLarge
              ? "Recording is too large. Please record less than 20 MB."
              : "Upload one audio recording in the audio field.",
          });
      }
      const file = req.file;
      if (!file || file.size === 0) {
        return res
          .status(400)
          .json({ error: "No audio was recorded. Please try again." });
      }
      const extension = audioFormats[file.mimetype];
      if (!extension) {
        return res
          .status(415)
          .json({
            error: "Unsupported recording format. Use WebM, MP4, MP3, or WAV.",
          });
      }
      try {
        const text = (
          await options.transcribe({
            buffer: file.buffer,
            filename: `answer.${extension}`,
            mimeType: file.mimetype,
          })
        ).trim();
        if (!text)
          return res
            .status(422)
            .json({ error: "No speech was recognized. Please try again." });
        return res.json({ text });
      } catch {
        return res
          .status(502)
          .json({
            error:
              "Could not transcribe the recording. Please record again or type your answer.",
          });
      }
    });
  });
  return router;
}
