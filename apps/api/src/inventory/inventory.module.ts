import { Module } from '@nestjs/common';
import { StockImportsController } from './stock-imports.controller';
import { StockExportsController } from './stock-exports.controller';
import { StockImportsService } from './stock-imports.service';
import { StockExportsService } from './stock-exports.service';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { ImportAttachmentsService } from './import-attachments.service';
import { RolesGuard } from '../common/roles.guard';

@Module({
  controllers: [StockImportsController, StockExportsController, StockAdjustmentsController],
  providers: [StockImportsService, StockExportsService, StockAdjustmentsService, ImportAttachmentsService, RolesGuard],
  exports: [StockExportsService, StockAdjustmentsService],
})
export class InventoryModule {}
