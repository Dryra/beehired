import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import cvRoutes from "./routes/cvRoutes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", cvRoutes);

const PORT = process.env.PORT || 3001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEMO_MODE = process.env.DEMO_MODE === "true";

app.post("/api/analyze", async (req, res) => {
  // For demo purposes
  if (DEMO_MODE) {
    return res.json({
      matchScore: 78,
      verdict: "Apply if interested",
      summary:
        "This role is a good potential match, with strong overlap in frontend, real-time systems, and AI product integration.",
      strongMatches: [
        "React/TypeScript",
        "AI API integration",
        "Product-focused frontend development",
      ],
      missingSkills: [
        "Specific domain experience",
        "Advanced cloud infrastructure",
      ],
      redFlags: ["Role may involve more backend ownership than expected"],
      whatToEmphasize: [
        "AI product integration",
        "Frontend architecture",
        "Real-world product thinking",
      ],
      applicationMessage:
        "Hi, I’m a Senior Software Engineer with experience building frontend, XR, and AI-powered applications. BeeHired reflects my interest in practical AI product development...",
      interviewRisk: "Medium",
    });
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
  "interviewRisk": "Low" | "Medium" | "High"
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
