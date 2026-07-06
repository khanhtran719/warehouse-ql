-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('SALE', 'INTERNAL', 'DAMAGE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IMPORT', 'EXPORT', 'IMPORT_CANCEL', 'EXPORT_CANCEL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "unitId" TEXT,
    "currentStock" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "defaultSalePrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockImport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "importDate" TIMESTAMP(3) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockImportItem" (
    "id" TEXT NOT NULL,
    "stockImportId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "StockImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockExport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "exportDate" TIMESTAMP(3) NOT NULL,
    "exportType" "ExportType" NOT NULL DEFAULT 'SALE',
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRevenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalProfit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockExportItem" (
    "id" TEXT NOT NULL,
    "stockExportId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "salePrice" DECIMAL(18,2) NOT NULL,
    "costPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "revenueAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "costAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "StockExportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "quantityChange" DECIMAL(18,3) NOT NULL,
    "stockBefore" DECIMAL(18,3) NOT NULL,
    "stockAfter" DECIMAL(18,3) NOT NULL,
    "costPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StockImport_code_key" ON "StockImport"("code");

-- CreateIndex
CREATE INDEX "StockImport_status_confirmedAt_idx" ON "StockImport"("status", "confirmedAt");

-- CreateIndex
CREATE INDEX "StockImport_importDate_idx" ON "StockImport"("importDate");

-- CreateIndex
CREATE INDEX "StockImportItem_productId_idx" ON "StockImportItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StockExport_code_key" ON "StockExport"("code");

-- CreateIndex
CREATE INDEX "StockExport_status_confirmedAt_idx" ON "StockExport"("status", "confirmedAt");

-- CreateIndex
CREATE INDEX "StockExport_exportDate_idx" ON "StockExport"("exportDate");

-- CreateIndex
CREATE INDEX "StockExport_exportType_idx" ON "StockExport"("exportType");

-- CreateIndex
CREATE INDEX "StockExportItem_productId_idx" ON "StockExportItem"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_referenceType_referenceId_idx" ON "StockMovement"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImport" ADD CONSTRAINT "StockImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImport" ADD CONSTRAINT "StockImport_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImportItem" ADD CONSTRAINT "StockImportItem_stockImportId_fkey" FOREIGN KEY ("stockImportId") REFERENCES "StockImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockImportItem" ADD CONSTRAINT "StockImportItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExport" ADD CONSTRAINT "StockExport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExport" ADD CONSTRAINT "StockExport_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExportItem" ADD CONSTRAINT "StockExportItem_stockExportId_fkey" FOREIGN KEY ("stockExportId") REFERENCES "StockExport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExportItem" ADD CONSTRAINT "StockExportItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
