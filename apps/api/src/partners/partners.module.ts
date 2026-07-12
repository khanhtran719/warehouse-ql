import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({ controllers: [PartnersController], providers: [PartnersService, RolesGuard], exports: [PartnersService] })
export class PartnersModule {}
