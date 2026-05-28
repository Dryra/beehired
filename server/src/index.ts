import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import cvRoutes from "./routes/cvRoutes";
import { getRandomJob } from "./utils/testDataUtils";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", cvRoutes);

const PORT = process.env.PORT || 3001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEMO_MODE = process.env.DEMO_MODE;
const DEMO_TOKEN = process.env.DEMO_TOKEN;

function isValidDemoToken(token: string | string[] | undefined) {
  return (
    typeof token === "string" && Boolean(DEMO_TOKEN) && token === DEMO_TOKEN
  );
}

app.get("/api/demo-token/validate", (req, res) => {
  const token = req.headers["x-demo-token"];

  res.json({ valid: isValidDemoToken(token) });
});

app.post("/api/analyze", async (req, res) => {
  console.log("demo mode", DEMO_MODE);
  // For demo purposes
  if (DEMO_MODE === "true") {
    console.log("showing demo mode");
    return res.json(getRandomJob());
  }

  const token = req.headers["x-demo-token"];
  console.log("### found token", token);

  if (!isValidDemoToken(token)) {
    //return res.status(403).json({ error: "Unauthorized" });
    return res.json(getRandomJob());
  }

  try {
    const { cv, jobDescription } = req.body;

    if (!cv || !jobDescription) {
      return res
        .status(400)
        .json({ error: "CV and job description are required." });
    }

    const prompt = `
You are a strict career advisor.

Analyze the candidate CV against the job description.
Extract company name and job name from job description if possible.
Estimate yearly salary based on the job description if possible.
Determine the best response strategy.

The responseStrategy.type must be one of:
- "apply"
- "explore"
- "decline"

Guidelines:
- Use "apply" if the role is a strong strategic fit
- Use "explore" if the role could be interesting but requires clarification or has mixed alignment
- Use "decline" if the role is not aligned with the user's profile, goals, preferred technologies, seniority, or direction

Then generate a professional response message based on the strategy.

If type is:
- "apply": generate an enthusiastic application or recruiter response
- "explore": generate a curious and open response asking for more information
- "decline": generate a polite recruiter rejection response

Also add a not interested message.
The tone should be professional, concise, modern, and human.

Return valid JSON only.

Return ONLY valid JSON with this structure:
{
  "matchScore": number,
  "verdict": string,
  "summary": string,
  "strongMatches": string[],
  "missingSkills": string[],
  "redFlags": string[],
  "whatToEmphasize": string[],
  "applicationMessage": string,
  "interviewRisk": "Low" | "Medium" | "High",
  "companyName": string,
  "jobName": string,
  "estimatedSalary": string,
  "responseStrategy": {
  type: "apply" | "decline" | "explore";
  message: string;
  }
  "notInterestedMessage":string
}

Scoring:
80-100 = Apply immediately
65-79 = Apply if interested
50-64 = Maybe, but risky
Below 50 = Skip

Candidate CV:
${cv}

Job Description:
${jobDescription}
`;

    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: prompt,
    });

    const text = response.output_text;
    const json = JSON.parse(text);

    res.json(json);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analysis failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
