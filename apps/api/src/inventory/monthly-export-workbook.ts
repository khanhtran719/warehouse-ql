import { ExportType } from '@prisma/client';
import ExcelJS from 'exceljs';

type Numeric = number | string | { toString(): string };

export type MonthlyExportRow = {
  quantity: Numeric;
  salePrice: Numeric;
  costPrice: Numeric;
  revenueAmount: Numeric;
  costAmount: Numeric;
  profitAmount: Numeric;
  product: { code: string; name: string };
  stockExport: {
    code: string;
    confirmedAt: Date | null;
    exportDate: Date;
    exportType: ExportType;
    createdBy: { name: string };
  };
};

export function buildMonthlyExportWorkbook(rows: MonthlyExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Phieu xuat chi tiet');

  sheet.columns = [
    { header: 'Mã phiếu', key: 'code', width: 18 },
    { header: 'Ngày xác nhận', key: 'confirmedDate', width: 16 },
    { header: 'Ngày xuất', key: 'date', width: 16 },
    { header: 'Loại', key: 'type', width: 14 },
    { header: 'Người tạo', key: 'user', width: 20 },
    { header: 'Mã hàng', key: 'productCode', width: 16 },
    { header: 'Tên hàng', key: 'productName', width: 28 },
    { header: 'Số lượng', key: 'qty', width: 12 },
    { header: 'Giá bán', key: 'sale', width: 14 },
    { header: 'Giá vốn', key: 'cost', width: 14 },
    { header: 'Thành tiền bán', key: 'revenue', width: 16 },
    { header: 'Thành tiền vốn', key: 'costAmount', width: 16 },
    { header: 'Lợi nhuận', key: 'profit', width: 16 },
  ];

  rows.forEach((row) =>
    sheet.addRow({
      code: row.stockExport.code,
      confirmedDate: row.stockExport.confirmedAt?.toISOString().slice(0, 10) ?? '',
      date: row.stockExport.exportDate.toISOString().slice(0, 10),
      type: row.stockExport.exportType,
      user: row.stockExport.createdBy.name,
      productCode: row.product.code,
      productName: row.product.name,
      qty: Number(row.quantity),
      sale: Number(row.salePrice),
      cost: Number(row.costPrice),
      revenue: Number(row.revenueAmount),
      costAmount: Number(row.costAmount),
      profit: Number(row.profitAmount),
    }),
  );
  sheet.getRow(1).font = { bold: true };

  return workbook;
}
