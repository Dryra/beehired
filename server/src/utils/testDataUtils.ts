export const EXAMPLE_JSON = [
  {
    matchScore: 85,
    verdict: "Strong Apply",
    summary:
      "Excellent alignment with frontend architecture and AI-driven product experience, with minimal gaps.",
    strongMatches: [
      "React/TypeScript",
      "System design for frontend",
      "AI-powered product development",
    ],
    missingSkills: ["Kubernetes", "Large-scale distributed systems"],
    redFlags: ["Company expects occasional DevOps involvement"],
    whatToEmphasize: [
      "Scalable frontend architecture",
      "AI integration in real products",
      "Ownership mindset",
    ],
    applicationMessage:
      "Hi, I’m a Senior Software Engineer specializing in frontend architecture and AI-powered applications. I’ve recently built BeeHired, a practical AI tool focused on real-world job decision support...",
    interviewRisk: "Low",
    estimatedSalary: "€75,000 - €95,000",
    jobName: "Senior Frontend Engineer",
    companyName: "TechFlow GmbH",
    id: "a1b2c3d4-1111-2222-3333-444455556666",
    savedAt: "2026-05-01T21:10:00.000Z",
  },
  {
    matchScore: 62,
    verdict: "Apply if motivated",
    summary:
      "Decent overlap in frontend skills but noticeable gaps in backend and cloud infrastructure.",
    strongMatches: ["React", "UI/UX focus", "Product mindset"],
    missingSkills: ["AWS", "Microservices", "Backend-heavy experience"],
    redFlags: [
      "Role leans heavily toward fullstack/backend",
      "Unclear product direction",
    ],
    whatToEmphasize: [
      "Frontend excellence",
      "Fast learning ability",
      "Cross-functional collaboration",
    ],
    applicationMessage:
      "Hi, I’m a frontend-focused engineer with strong experience building user-centric applications and integrating AI features into real products...",
    interviewRisk: "Medium",
    estimatedSalary: "€65,000 - €80,000",
    jobName: "Fullstack Engineer",
    companyName: "CloudScale Labs",
    id: "b2c3d4e5-2222-3333-4444-555566667777",
    savedAt: "2026-05-01T21:12:00.000Z",
  },
  {
    matchScore: 91,
    verdict: "Must Apply",
    summary:
      "Near-perfect match with strong overlap in AI, frontend systems, and product-focused engineering.",
    strongMatches: [
      "AI API integration",
      "React/TypeScript",
      "Real-time systems",
      "Product engineering",
    ],
    missingSkills: ["Minor domain-specific knowledge"],
    redFlags: [],
    whatToEmphasize: [
      "AI product thinking",
      "End-to-end feature ownership",
      "Real-time and interactive systems",
    ],
    applicationMessage:
      "Hi, I’m a Senior Software Engineer focused on building AI-powered interactive systems. My recent project, BeeHired, demonstrates my ability to turn AI into a practical product...",
    interviewRisk: "Low",
    estimatedSalary: "€85,000 - €110,000",
    jobName: "AI Product Engineer",
    companyName: "NextGen AI",
    id: "c3d4e5f6-3333-4444-5555-666677778888",
    savedAt: "2026-05-01T21:15:00.000Z",
  },
  {
    matchScore: 48,
    verdict: "Skip",
    summary:
      "Significant mismatch due to heavy backend and infrastructure requirements.",
    strongMatches: ["Basic frontend experience"],
    missingSkills: ["Go", "Distributed systems", "DevOps", "Database scaling"],
    redFlags: [
      "Backend-heavy role misaligned with profile",
      "High infrastructure ownership expectations",
    ],
    whatToEmphasize: [
      "Transferable engineering principles",
      "Willingness to learn (if applying anyway)",
    ],
    applicationMessage:
      "Hi, I’m a software engineer with a strong focus on frontend and AI-driven applications. While my background is more frontend-oriented...",
    interviewRisk: "High",
    estimatedSalary: "€70,000 - €90,000",
    jobName: "Backend Engineer",
    companyName: "InfraCore Systems",
    id: "d4e5f6g7-4444-5555-6666-777788889999",
    savedAt: "2026-05-01T21:18:00.000Z",
  },
  {
    matchScore: 74,
    verdict: "Apply",
    summary:
      "Good match with emphasis on product development and modern frontend stack, slight gaps in scaling experience.",
    strongMatches: [
      "React ecosystem",
      "Product-focused mindset",
      "Modern tooling (Vite, TypeScript)",
    ],
    missingSkills: [
      "High-scale performance optimization",
      "Advanced monitoring",
    ],
    redFlags: ["Startup volatility", "Broad role expectations"],
    whatToEmphasize: [
      "Shipping real products",
      "Speed of execution",
      "Clean UI/UX thinking",
    ],
    applicationMessage:
      "Hi, I’m a Senior Software Engineer who enjoys building clean, user-focused products. My recent project, BeeHired, reflects my approach to combining AI with intuitive frontend design...",
    interviewRisk: "Medium",
    estimatedSalary: "€70,000 - €90,000",
    jobName: "Product Engineer",
    companyName: "StartupHive",
    id: "e5f6g7h8-5555-6666-7777-888899990000",
    savedAt: "2026-05-01T21:20:00.000Z",
  },
];

export const getRandomJob = () => {
  const randomIndex = Math.floor(Math.random() * EXAMPLE_JSON.length);

  return EXAMPLE_JSON[randomIndex];
};
