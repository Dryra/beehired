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

app.post("/api/analyze", async (req, res) => {
  console.log("demo mode", DEMO_MODE);
  // For demo purposes
  if (DEMO_MODE === "true") {
    console.log("showing demo mode");
    return res.json(getRandomJob());
  }

  const token = req.headers["x-demo-token"];

  if (!token || token !== DEMO_TOKEN) {
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
  "estimatedSalary": string
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
