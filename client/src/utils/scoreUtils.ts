export function getScoreClass(score: number) {
  if (score >= 80) return "scoreHigh";
  if (score >= 65) return "scoreMedium";
  return "scoreLow";
}

export function getScoreLabel(score: number) {
  if (score >= 80) return "Strong fit";
  if (score >= 65) return "Potential fit";
  return "Risky fit";
}
