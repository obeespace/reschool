import Score from "@/app/models/Score";

export async function calculateTermAverage(
  studentId: string,
  classId: string,
  term: number
) {
  const scores = await Score.find({ studentId, classId, term });
  if (!scores.length) return 0;

  const total = scores.reduce((sum, s) => sum + s.total, 0);
  return Math.round(total / scores.length);
}

export async function calculateFinalAverage(
  termAverages: number[]
) {
  const valid = termAverages.filter((n) => n > 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
