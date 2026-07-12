export type VoucherStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type ExportType = 'SALE' | 'INTERNAL' | 'DAMAGE';
export type Numeric = string | number;

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type User = {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
};

export type ManagedUser = User & {
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type Partner = {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  contactPerson?: string | null;
  note?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type PartnerInput = Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>;

export type Category = {
  id: string;
  name: string;
};

export type Unit = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  categoryId?: string | null;
  unitId?: string | null;
  currentStock: Numeric;
  averageCost: Numeric;
  defaultSalePrice: Numeric;
  minStock: Numeric;
  note?: string | null;
  category?: Category | null;
  unit?: Unit | null;
};

export type StockMovement = {
  id: string;
  movementType: 'IMPORT' | 'EXPORT' | 'IMPORT_CANCEL' | 'EXPORT_CANCEL' | 'ADJUSTMENT';
  referenceType: string;
  referenceId: string;
  quantityChange: Numeric;
  stockBefore: Numeric;
  stockAfter: Numeric;
  costPrice: Numeric;
  createdAt: string;
  note?: string | null;
};

export type ProductInput = {
  code: string;
  name: string;
  categoryId?: string | null;
  unitId?: string | null;
  defaultSalePrice: number;
  minStock: number;
  note?: string;
};

export type VoucherItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type StockImportItem = {
  id: string;
  productId: string;
  quantity: Numeric;
  unitPrice: Numeric;
  totalAmount: Numeric;
  product?: Product;
};

export type StockImport = {
  id: string;
  code: string;
  importDate: string;
  status: VoucherStatus;
  totalAmount: Numeric;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierAddress?: string | null;
  supplierPhone?: string | null;
  supplierTaxCode?: string | null;
  note?: string | null;
  items: StockImportItem[];
  attachments: ImportAttachment[];
  createdBy?: Pick<User, 'name'>;
};

export type ImportAttachment = {
  id: string;
  stockImportId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type StockExportItem = {
  id: string;
  productId: string;
  quantity: Numeric;
  salePrice: Numeric;
  costPrice: Numeric;
  revenueAmount: Numeric;
  costAmount: Numeric;
  profitAmount: Numeric;
  product?: Product;
};

export type StockExport = {
  id: string;
  code: string;
  exportDate: string;
  exportType: ExportType;
  status: VoucherStatus;
  totalRevenue: Numeric;
  totalCost: Numeric;
  totalProfit: Numeric;
  customerId?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerTaxCode?: string | null;
  note?: string | null;
  items: StockExportItem[];
  createdBy?: Pick<User, 'name'>;
};

export type CreateImportInput = {
  importDate: string;
  supplierId?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierTaxCode?: string;
  note?: string;
  items: VoucherItemInput[];
};

export type CreateExportInput = {
  exportDate: string;
  exportType: ExportType;
  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerTaxCode?: string;
  note?: string;
  items: VoucherItemInput[];
};

export type TopProductRow = {
  product?: Product;
  quantity: number;
  revenue: number;
  profit: number;
};

export type ReportOverview = {
  totalImport: number;
  importCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  exportCount: number;
  lowStock: Product[];
  topProducts: TopProductRow[];
};

export type DailyReportRow = {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
};
