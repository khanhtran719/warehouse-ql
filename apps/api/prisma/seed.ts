import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123456', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', name: 'Administrator', passwordHash, role: UserRole.ADMIN },
  });

  const unit = await prisma.unit.upsert({ where: { name: 'Cái' }, update: {}, create: { name: 'Cái' } });
  const category = await prisma.category.upsert({ where: { name: 'Hàng hoá' }, update: {}, create: { name: 'Hàng hoá' } });
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

main().finally(async () => prisma.$disconnect());
