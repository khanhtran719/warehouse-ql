export type VoucherStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type ExportType = 'SALE' | 'INTERNAL' | 'DAMAGE';
export type Product = { id: string; code: string; name: string; currentStock: string | number; averageCost: string | number; defaultSalePrice: string | number; minStock: string | number; category?: { name: string }; unit?: { name: string } };
export type VoucherItemInput = { productId: string; quantity: number; unitPrice: number };
export type StockImport = { id: string; code: string; importDate: string; status: VoucherStatus; totalAmount: string | number; items: any[]; createdBy?: { name: string } };
export type StockExport = { id: string; code: string; exportDate: string; exportType: ExportType; status: VoucherStatus; totalRevenue: string | number; totalCost: string | number; totalProfit: string | number; items: any[]; createdBy?: { name: string } };
