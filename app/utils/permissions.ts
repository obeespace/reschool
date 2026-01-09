import { ITokenPayload } from "./auth";

export const allowRoles = (user: ITokenPayload | null, roles: string[]): boolean => {
  if (!user || !roles.includes(user.role)) return false;
  return true;
};
