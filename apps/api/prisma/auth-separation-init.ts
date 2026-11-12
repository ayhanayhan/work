import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@example.com').trim().toLowerCase();
  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (!existing) {
    const legacy = await prisma.user.findUnique({ where: { email } });
    let passwordHash = legacy?.passwordHash || '';
    if (!passwordHash) {
      const password = String(process.env.SEED_SUPERADMIN_PASSWORD || '');
      if (!password) throw new Error('No legacy superadmin found and SEED_SUPERADMIN_PASSWORD is missing');
      passwordHash = await bcrypt.hash(password, 14);
    }
    await prisma.superAdmin.create({ data: { email, name: legacy?.name || 'Platform Admin', passwordHash, isActive: true } });
    console.log('[auth-separation] superadmin identity created in isolated table');
  }

  const legacy = await prisma.user.findUnique({ where: { email } });
  if (legacy) {
    await prisma.userSession.updateMany({ where: { userId: legacy.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (legacy.isSuperAdmin) await prisma.user.update({ where: { id: legacy.id }, data: { isSuperAdmin: false } });
  }
  console.log('[auth-separation] legacy shared superadmin sessions revoked');
}

main().finally(() => prisma.$disconnect());
