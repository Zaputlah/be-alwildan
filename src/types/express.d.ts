import type { AdminScope, UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        fullName: string;
        email: string;
        role: UserRole;
        adminScope: AdminScope;
        schoolUnitId: string;
        schoolUnitName: string;
        sessionId: string;
        csrfHash: string;
      };
    }
  }
}

export {};
