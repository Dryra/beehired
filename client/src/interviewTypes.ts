export type Round = "intro" | "technical" | "soft-skills";
export type Difficulty = "easy" | "medium" | "hard";
export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "sql"
  | "cpp"
  | "plaintext";
export type InterviewQuestion = {
  type: "general" | "technical" | "coding" | "behavioral";
  prompt: string;
  focus: string;
  language: CodeLanguage;
  starterCode: string;
};
export type InterviewFeedback = {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  exampleAnswer: string;
};
export type InterviewTurn = {
  question: InterviewQuestion;
  answer: string;
  language: CodeLanguage;
  feedback: InterviewFeedback;
};
export type InterviewResponse = {
  question: InterviewQuestion | null;
  feedback: InterviewFeedback | null;
};
