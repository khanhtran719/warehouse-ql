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
  currentStock: Numeric;
  averageCost: Numeric;
  defaultSalePrice: Numeric;
  minStock: Numeric;
  category?: Category | null;
  unit?: Unit | null;
};

export type ProductInput = {
  code: string;
  name: string;
  categoryId?: string;
  unitId?: string;
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
  items: StockImportItem[];
  createdBy?: Pick<User, 'name'>;
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
  items: StockExportItem[];
  createdBy?: Pick<User, 'name'>;
};

export type CreateImportInput = {
  importDate: string;
  note?: string;
  items: VoucherItemInput[];
};

export type CreateExportInput = {
  exportDate: string;
  exportType: ExportType;
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
