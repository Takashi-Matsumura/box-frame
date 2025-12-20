import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      language: string;
      twoFactorEnabled: boolean;
      mustChangePassword: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: Role;
    language?: string;
    twoFactorEnabled?: boolean;
  }
}
