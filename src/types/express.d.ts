import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        fullName: string;
        email: string;
        role: UserRole;
        schoolUnitId: string;
        schoolUnitName: string;
        sessionId: string;
        csrfHash: string;
      };
    }
  }
}

export {};
