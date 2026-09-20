import { prisma } from '../config/prisma.js';
export async function audit(req, action, entity, entityId, metadata) {
    if (!req.auth)
        return;
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
export const publicUser = (user) => ({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    adminScope: user.adminScope,
    schoolUnit: user.schoolUnit,
});
