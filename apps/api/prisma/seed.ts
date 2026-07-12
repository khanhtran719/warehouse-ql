import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_DEV_ADMIN_PASSWORD = 'admin123456';

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD ?? getDevelopmentAdminPassword();
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', name: 'Administrator', passwordHash, role: UserRole.ADMIN },
  });

  const unit = await prisma.unit.upsert({ where: { name: 'Cái' }, update: {}, create: { name: 'Cái' } });
  const category = await prisma.category.upsert({
    where: { name: 'Hàng hoá' },
    update: {},
    create: { name: 'Hàng hoá' },
  });
  await prisma.product.upsert({
    where: { code: 'SP001' },
    update: {},
    create: {
      code: 'SP001',
      name: 'Sản phẩm mẫu',
      unitId: unit.id,
      categoryId: category.id,
      defaultSalePrice: 120000,
      minStock: 5,
    },
  });
}

function getDevelopmentAdminPassword() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD is required when seeding in production');
  }
  return DEFAULT_DEV_ADMIN_PASSWORD;
}

main().finally(async () => prisma.$disconnect());
