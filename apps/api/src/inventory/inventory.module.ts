import { Module } from '@nestjs/common';
import { StockImportsController } from './stock-imports.controller';
import { StockExportsController } from './stock-exports.controller';
import { StockImportsService } from './stock-imports.service';
import { StockExportsService } from './stock-exports.service';

@Module({ controllers: [StockImportsController, StockExportsController], providers: [StockImportsService, StockExportsService], exports: [StockExportsService] })
export class InventoryModule {}
