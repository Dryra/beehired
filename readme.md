# 🐝 BeeHired

**Know before you apply.**

BeeHired is an AI-powered job fit analyzer that compares a candidate CV with a job description and returns a structured application recommendation.

It helps users understand whether a role is worth applying for by showing a match score, strong matches, missing skills, red flags, and a tailored application message.

## ✨ Features

- CV and job description analysis
- Match score from 0–100%
- Apply / skip recommendation
- Strong matches and missing skills
- Red flags and interview risk
- Tailored application message
- PDF CV upload
- Copy-to-clipboard application message

## 🧠 Why I built it

I built BeeHired while job hunting to solve a problem I had: quickly understanding whether a role is actually worth applying for.

The goal was to build something practical and polished.

## 🛠 Tech Stack

### Frontend

- React
- TypeScript
- Vite
- SCSS

### Backend

- Node.js
- Express
- OpenAI API

## 🧩 How it works

1. User uploads or pastes a CV
2. User pastes a job description
3. Backend sends structured data to the AI model
4. AI returns a JSON analysis
5. Frontend displays the result in a clean dashboard

## 🔐 API Key Safety

The OpenAI API key is stored only on the backend using environment variables.

The key is never exposed in frontend code or committed to GitHub.

For the public demo, the AI endpoint can be disabled or protected to prevent unwanted API usage.

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/dryra/beehired.git
cd beehired
```

### 2. Install frontend dependencies

```bash
cd client
npm install
npm run dev
```

### 3. Install backend dependencies

```bash
cd server
npm install
```

### 4. Create .env

```bash
OPENAI_API_KEY=your_openai_api_key_here
DEMO_MODE=false
```

### 5. Run frontend

```bash
npm run dev
```

### 6. Run Backend

```bash
npm run dev
```

### 👨‍💻 Author

_Ahmed Drira_:
Senior Software Engineer focused on frontend, XR, real-time systems, and AI-powered interactive applications.
