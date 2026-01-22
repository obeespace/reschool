import TeacherProfile from "@/app/models/TeacherProfile";

/**
 * Check if a teacher is the class teacher of a specific class
 */
export async function isClassTeacher(userId: string, classId: string): Promise<boolean> {
  const profile = await TeacherProfile.findOne({ userId });
  if (!profile || !profile.classTeacherOf) return false;
  return profile.classTeacherOf.toString() === classId;
}

/**
 * Check if a teacher teaches a subject in a specific class
 */
export async function teachesSubjectInClass(
  userId: string, 
  subjectId: string, 
  classId: string
): Promise<boolean> {
  const profile = await TeacherProfile.findOne({ userId });
  if (!profile) return false;

  return profile.subjectsAndClasses.some(
    (sc: any) => 
      sc.subjectId.toString() === subjectId &&
      sc.classIds.some((cId: any) => cId.toString() === classId)
  );
}

/**
 * Get all classes a teacher teaches (either as class teacher or subject teacher)
 */
export async function getTeacherClasses(userId: string): Promise<string[]> {
  const profile = await TeacherProfile.findOne({ userId });
  if (!profile) return [];

  const classIds = new Set<string>();

  // Add class they are class teacher of
  if (profile.classTeacherOf) {
    classIds.add(profile.classTeacherOf.toString());
  }

  // Add all classes they teach subjects in
  profile.subjectsAndClasses.forEach((sc: any) => {
    sc.classIds.forEach((classId: any) => {
      classIds.add(classId.toString());
    });
  });

  return Array.from(classIds);
}

/**
 * Get all subjects a teacher teaches
 */
export async function getTeacherSubjects(userId: string): Promise<string[]> {
  const profile = await TeacherProfile.findOne({ userId });
  if (!profile) return [];

  return profile.subjectsAndClasses.map((sc: any) => sc.subjectId.toString());
}
