-- Extend the immutable movement ledger with physical stock corrections.
ALTER TYPE "MovementType" ADD VALUE 'ADJUSTMENT';

-- Preserve the actor relationship for every stock mutation.
ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Support voucher detail loading/deletion and report filters at scale.
CREATE INDEX "Product_currentStock_idx" ON "Product"("currentStock");
CREATE INDEX "StockImportItem_stockImportId_idx" ON "StockImportItem"("stockImportId");
CREATE INDEX "StockExport_status_exportType_confirmedAt_idx"
ON "StockExport"("status", "exportType", "confirmedAt");
CREATE INDEX "StockExportItem_stockExportId_idx" ON "StockExportItem"("stockExportId");
CREATE INDEX "StockMovement_createdById_idx" ON "StockMovement"("createdById");

-- Enforce critical invariants for all new writes without blocking deploys on
-- legacy rows that may need a separate reconciliation pass.
ALTER TABLE "Product"
ADD CONSTRAINT "Product_non_negative_stock_check" CHECK ("currentStock" >= 0) NOT VALID;
ALTER TABLE "StockImportItem"
ADD CONSTRAINT "StockImportItem_positive_quantity_check" CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "StockImportItem"
ADD CONSTRAINT "StockImportItem_non_negative_price_check" CHECK ("unitPrice" >= 0) NOT VALID;
ALTER TABLE "StockExportItem"
ADD CONSTRAINT "StockExportItem_positive_quantity_check" CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "StockExportItem"
ADD CONSTRAINT "StockExportItem_non_negative_price_check" CHECK ("salePrice" >= 0) NOT VALID;
