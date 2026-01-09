import jwt from "jsonwebtoken";

export interface ITokenPayload {
  id: string;
  fullName: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
  schoolId: string;
}

export const verifyToken = (token: string): ITokenPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as ITokenPayload;
  } catch {
    return null;
  }
};
