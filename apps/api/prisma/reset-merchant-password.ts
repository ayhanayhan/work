import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

async function main() {
  const email = String(process.env.RESET_MERCHANT_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.RESET_MERCHANT_PASSWORD || '');
  if (!email) throw new Error('RESET_MERCHANT_EMAIL is required');
  if (!strong.test(password)) throw new Error('RESET_MERCHANT_PASSWORD must be 8-128 chars with upper/lower/number/symbol');
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { select: { id: true } } } });
  if (!user || !user.memberships.length) throw new Error('Merchant user not found');
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 13) } }),
    prisma.merchantSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  console.log(`Password reset completed for ${email}. Existing sessions revoked.`);
}

main().finally(() => prisma.$disconnect());
