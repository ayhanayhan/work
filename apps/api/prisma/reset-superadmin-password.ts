import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;

async function main() {
  const email = String(process.env.RESET_SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.RESET_SUPERADMIN_PASSWORD || '');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('RESET_SUPERADMIN_EMAIL must be a valid email');
  if (!strong.test(password)) throw new Error('RESET_SUPERADMIN_PASSWORD must be 12-128 chars with upper/lower/number/symbol');

  const current = await prisma.superAdmin.findUnique({ where: { email }, select: { id: true } });
  const passwordHash = await bcrypt.hash(password, 14);
  const admin = current
    ? await prisma.superAdmin.update({ where: { id: current.id }, data: { passwordHash, passwordChangedAt: new Date(), isActive: true } })
    : await prisma.superAdmin.create({ data: { email, name: 'Platform Admin', passwordHash, passwordChangedAt: new Date(), isActive: true } });

  await prisma.$transaction([
    prisma.superAdminSession.updateMany({ where: { superAdminId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.securityEvent.create({ data: { kind: 'superadmin_password_admin_reset', emailHash: null, ipHash: null, success: true, metadata: { superAdminId: admin.id } } }),
  ]);
  console.log(`Super Admin access restored for ${email}. Existing sessions revoked.`);
}

main().finally(() => prisma.$disconnect());
