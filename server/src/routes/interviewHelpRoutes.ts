import { Router } from "express";
import {
  interviewHelpRequestSchema,
  interviewHelpOutputSchema,
  type InterviewHelpRequest,
} from "../interviewHelp";

export function createInterviewHelpRouter(options: {
  canUseAI: (token: string | string[] | undefined) => boolean;
  generate: (request: InterviewHelpRequest) => Promise<unknown>;
}) {
  const router = Router();
  router.post("/interview/help", async (req, res) => {
    if (!options.canUseAI(req.headers["x-demo-token"])) {
      return res
        .status(403)
        .json({
          error:
            "Interview help requires live AI access and demo mode disabled.",
        });
    }
    const parsed = interviewHelpRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid interview help request." });
    try {
      const result = interviewHelpOutputSchema(parsed.data.mode).parse(
        await options.generate(parsed.data)
      );
      return res.json(result);
    } catch {
      return res
        .status(502)
        .json({
          error:
            "Could not load interview help. Please try again; your draft is unchanged.",
        });
    }
  });
  return router;
}
