export async function calculateTermAverage(
  studentId: string,
  classId: string,
  term: number
) {
  void studentId;
  void classId;
  void term;
  return 0;
}

export async function calculateFinalAverage(
  termAverages: number[]
) {
  const valid = termAverages.filter((n) => n > 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
