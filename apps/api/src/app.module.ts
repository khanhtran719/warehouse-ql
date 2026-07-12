import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { ReportsModule } from './reports/reports.module';
import { validateEnv } from './config/env';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';
import { PartnersModule } from './partners/partners.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    ReportsModule,
    UsersModule,
    PartnersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
