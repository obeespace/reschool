import jwt from "jsonwebtoken";

export interface ITokenPayload {
  userId: string; // User's _id from database
  fullName: string;
  role: "ADMIN" | "TEACHER" | "PARENT" | "SUPERADMIN";
  schoolId: string;
}

export const verifyToken = (token: string): ITokenPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as ITokenPayload;
  } catch {
    return null;
  }
};
