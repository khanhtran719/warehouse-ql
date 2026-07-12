import { ExportType, VoucherStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildDeliveryWorkbook } from './delivery-workbook';
import { buildMonthlyExportWorkbook } from './monthly-export-workbook';

describe('inventory Excel workbooks', () => {
  it('renders delivery company profile from runtime configuration', () => {
    const workbook = buildDeliveryWorkbook(
      {
        id: 'export-1',
        code: 'PX1',
        exportDate: new Date('2026-07-11T00:00:00.000Z'),
        exportType: ExportType.SALE,
        status: VoucherStatus.CONFIRMED,
        totalRevenue: 100,
        totalCost: 50,
        totalProfit: 50,
        confirmedAt: new Date(),
        cancelledAt: null,
        customerName: 'Khách A',
        customerAddress: 'Đồng Nai',
        note: null,
        createdById: 'user-1',
        confirmedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { name: 'Admin' },
        items: [],
      },
      {
        companyName: 'Công ty Cấu hình',
        companyAddress: 'Địa chỉ cấu hình',
        companyPhone: '0900000000',
        bankAccount: '123456',
        bankAccountName: 'Công ty Cấu hình',
        bankName: 'Ngân hàng A',
      },
    );

    const sheet = workbook.getWorksheet('Phieu giao hang');
    expect(sheet?.getCell('A1').value).toBe('Công ty Cấu hình');
    expect(sheet?.getCell('A2').value).toBe('Đ/C: Địa chỉ cấu hình');
    expect(sheet?.getCell('F1').value).toBe('TK: 123456');
  });

  it('builds monthly export rows without depending on the inventory service', () => {
    const workbook = buildMonthlyExportWorkbook([
      {
        quantity: 2,
        salePrice: 100,
        costPrice: 60,
        revenueAmount: 200,
        costAmount: 120,
        profitAmount: 80,
        product: { code: 'SP1', name: 'Sản phẩm 1' },
        stockExport: {
          code: 'PX1',
          exportDate: new Date('2026-07-11T00:00:00.000Z'),
          exportType: ExportType.SALE,
          confirmedAt: new Date('2026-07-11T01:00:00.000Z'),
          createdBy: { name: 'Admin' },
        },
      },
    ]);

    const sheet = workbook.getWorksheet('Phieu xuat chi tiet');
    expect(sheet?.getCell('A2').value).toBe('PX1');
    expect(sheet?.getCell('M2').value).toBe(80);
  });
});
