import type { Prisma, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../config/prisma.js';

export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
) {
  if (!req.auth) return;
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      metadata,
      ipAddress: req.ip,
      userId: req.auth.userId,
      schoolUnitId: req.auth.schoolUnitId,
    },
  });
}

export const publicUser = (user: {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  adminScope?: string;
  schoolUnit: { id: string; name: string; code: string };
}) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  adminScope: user.adminScope,
  schoolUnit: user.schoolUnit,
});
