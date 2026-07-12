-- Customer and supplier master data.
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "contactPerson" TEXT,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "contactPerson" TEXT,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_status_idx" ON "Customer"("status");
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- Optional partner links plus immutable contact snapshots on vouchers.
ALTER TABLE "StockImport"
ADD COLUMN "supplierId" TEXT,
ADD COLUMN "supplierName" TEXT,
ADD COLUMN "supplierAddress" TEXT,
ADD COLUMN "supplierPhone" TEXT,
ADD COLUMN "supplierTaxCode" TEXT;

ALTER TABLE "StockExport"
ADD COLUMN "customerId" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "customerTaxCode" TEXT;

CREATE INDEX "StockImport_supplierId_idx" ON "StockImport"("supplierId");
CREATE INDEX "StockExport_customerId_idx" ON "StockExport"("customerId");

ALTER TABLE "StockImport"
ADD CONSTRAINT "StockImport_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockExport"
ADD CONSTRAINT "StockExport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Receipt images are stored on disk; only safe metadata and ownership live in PostgreSQL.
CREATE TABLE "StockImportAttachment" (
    "id" TEXT NOT NULL,
    "stockImportId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockImportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockImportAttachment_storageKey_key" ON "StockImportAttachment"("storageKey");
CREATE INDEX "StockImportAttachment_stockImportId_createdAt_idx" ON "StockImportAttachment"("stockImportId", "createdAt");
CREATE INDEX "StockImportAttachment_uploadedById_idx" ON "StockImportAttachment"("uploadedById");
ALTER TABLE "StockImportAttachment"
ADD CONSTRAINT "StockImportAttachment_stockImportId_fkey" FOREIGN KEY ("stockImportId") REFERENCES "StockImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockImportAttachment"
ADD CONSTRAINT "StockImportAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
