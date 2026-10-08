import { Router } from "express";
import {
  interviewRequestSchema,
  validateInterviewOutput,
  type InterviewRequest,
} from "../interview";

export function createInterviewRouter(options: {
  canUseAI: (token: string | string[] | undefined) => boolean;
  generate: (request: InterviewRequest) => Promise<unknown>;
}) {
  const router = Router();
  router.post("/interview/turn", async (req, res) => {
    if (!options.canUseAI(req.headers["x-demo-token"])) {
      return res
        .status(403)
        .json({
          error:
            "Interview practice requires live AI access. Open your access link with a valid token and ensure demo mode is disabled.",
        });
    }
    const parsed = interviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error:
            "Invalid interview request. Check the job description, answer and session settings.",
        });
    }
    try {
      const output = await options.generate(parsed.data);
      return res.json(validateInterviewOutput(parsed.data, output));
    } catch {
      // Never log the CV, answers, token or provider response.
      return res
        .status(502)
        .json({
          error:
            "The interview assistant could not respond. Your answer is still here; please try again.",
        });
    }
  });
  return router;
}
