import { ConflictException } from '@nestjs/common';
import { ExportType, VoucherStatus } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDeliveryWorkbook } from './delivery-workbook';
import { StockExportsService } from './stock-exports.service';
import { StockImportsService } from './stock-imports.service';

const deliveryProfile = {
  companyName: 'NPP PHONG VÂN PHÁT',
  companyAddress: 'Tổ 12, KP 5A, Trảng Dài, Đồng Nai',
  companyPhone: '0839650939',
  bankAccount: '8858064483',
  bankAccountName: 'Hộ kinh doanh Phong Vân Phát',
  bankName: 'Ngân hàng BIDV',
};
const deliveryConfig = {
  get: vi.fn(
    (key: string) =>
      ({
        DELIVERY_COMPANY_NAME: deliveryProfile.companyName,
        DELIVERY_COMPANY_ADDRESS: deliveryProfile.companyAddress,
        DELIVERY_COMPANY_PHONE: deliveryProfile.companyPhone,
        DELIVERY_BANK_ACCOUNT: deliveryProfile.bankAccount,
        DELIVERY_BANK_ACCOUNT_NAME: deliveryProfile.bankAccountName,
        DELIVERY_BANK_NAME: deliveryProfile.bankName,
      })[key],
  ),
};

describe('inventory voucher confirmation safety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-checks import voucher status inside the transaction before applying stock', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      stockImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'import-1',
          status: VoucherStatus.CONFIRMED,
          items: [],
        }),
      },
      product: { findUnique: vi.fn(), update: vi.fn() },
      stockMovement: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockImportsService(prisma as never);

    await expect(service.confirm('import-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('returns a business conflict when an export voucher does not have enough stock', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      stockExport: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'export-1',
          code: 'PX1',
          status: VoucherStatus.DRAFT,
          exportType: ExportType.SALE,
          items: [
            {
              id: 'item-1',
              productId: 'product-1',
              quantity: 2,
              salePrice: 100,
            },
          ],
        }),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'product-1',
            name: 'Hàng A',
            currentStock: 1,
            averageCost: 50,
          },
        ]),
        update: vi.fn(),
      },
      stockExportItem: { update: vi.fn() },
      stockMovement: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockExportsService(prisma as never, deliveryConfig as never);

    await expect(service.confirm('export-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('stores delivery recipient details when an export voucher is created', async () => {
    const createdVoucher = {
      id: 'export-1',
      code: 'PX20260708-123456',
      exportDate: new Date('2026-07-08T00:00:00.000Z'),
      exportType: ExportType.SALE,
      status: VoucherStatus.DRAFT,
      totalRevenue: 920000,
      note: null,
      customerName: 'Tôm KID Quảng Biển',
      customerAddress: 'Đồng Nai',
      createdBy: { name: 'Admin' },
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 1,
          salePrice: 920000,
          product: { code: 'ZAN M', name: 'SunSum', unit: { name: 'Bao' } },
        },
      ],
    };
    const prisma = {
      stockExport: { create: vi.fn().mockResolvedValue(createdVoucher) },
    };
    const service = new StockExportsService(prisma as never, deliveryConfig as never);

    const result = await service.create(
      {
        exportDate: '2026-07-08',
        exportType: ExportType.SALE,
        customerName: 'Tôm KID Quảng Biển',
        customerAddress: 'Đồng Nai',
        items: [{ productId: 'product-1', quantity: 1, unitPrice: 920000 }],
      },
      'user-1',
    );

    expect(result).toBe(createdVoucher);
    expect(prisma.stockExport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: 'Tôm KID Quảng Biển',
          customerAddress: 'Đồng Nai',
        }),
      }),
    );
  });

  it('snapshots the selected customer details on an export voucher', async () => {
    const prisma = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'customer-1',
          status: 'ACTIVE',
          name: 'Khách hàng A',
          address: 'Đồng Nai',
          phone: '0909000000',
          taxCode: '0312345678',
        }),
      },
      stockExport: { create: vi.fn().mockResolvedValue({ id: 'export-1' }) },
    };
    const service = new StockExportsService(prisma as never, deliveryConfig as never);

    await service.create(
      {
        exportDate: '2026-07-11',
        exportType: ExportType.SALE,
        customerId: 'customer-1',
        items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
      },
      'user-1',
    );

    expect(prisma.stockExport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'customer-1',
          customerName: 'Khách hàng A',
          customerAddress: 'Đồng Nai',
          customerPhone: '0909000000',
          customerTaxCode: '0312345678',
        }),
      }),
    );
  });

  it('snapshots the selected supplier details on an import voucher', async () => {
    const prisma = {
      supplier: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'supplier-1',
          status: 'ACTIVE',
          name: 'Nhà cung cấp A',
          address: 'TP.HCM',
          phone: '0911000000',
          taxCode: '0300000001',
        }),
      },
      stockImport: { create: vi.fn().mockResolvedValue({ id: 'import-1' }) },
    };
    const service = new StockImportsService(prisma as never);

    await service.create(
      {
        importDate: '2026-07-11',
        supplierId: 'supplier-1',
        items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
      },
      'user-1',
    );

    expect(prisma.stockImport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplierId: 'supplier-1',
          supplierName: 'Nhà cung cấp A',
          supplierAddress: 'TP.HCM',
          supplierPhone: '0911000000',
          supplierTaxCode: '0300000001',
        }),
      }),
    );
  });

  it('updates delivery recipient details on a draft export voucher', async () => {
    const updatedVoucher = {
      id: 'export-1',
      customerName: 'Khách hàng mới',
      customerAddress: 'Địa chỉ mới',
      items: [],
    };
    const tx = {
      $queryRaw: vi.fn(),
      stockExport: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'export-1',
          status: VoucherStatus.DRAFT,
        }),
        update: vi.fn().mockResolvedValue(updatedVoucher),
      },
      stockExportItem: { deleteMany: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const service = new StockExportsService(prisma as never, deliveryConfig as never);

    const result = await service.update('export-1', {
      exportDate: '2026-07-08',
      exportType: ExportType.SALE,
      customerName: 'Khách hàng mới',
      customerAddress: 'Địa chỉ mới',
      items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
    });

    expect(result).toBe(updatedVoucher);
    expect(tx.stockExport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: 'Khách hàng mới',
          customerAddress: 'Địa chỉ mới',
        }),
      }),
    );
  });

  it('rejects downloading a cancelled delivery voucher', async () => {
    const prisma = {
      stockExport: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'export-1',
          code: 'PX20260708-123456',
          status: VoucherStatus.CANCELLED,
          createdBy: { name: 'Admin' },
          items: [],
        }),
      },
    };
    const service = new StockExportsService(prisma as never, deliveryConfig as never);

    await expect(service.downloadDeliveryFile('export-1')).rejects.toThrow('Không thể tải phiếu giao hàng đã huỷ');
  });

  it('supports concurrent in-memory delivery voucher downloads', async () => {
    const voucher = {
      id: 'export-1',
      code: 'PX20260708-123456',
      exportDate: new Date('2026-07-07T17:00:00.000Z'),
      exportType: ExportType.SALE,
      status: VoucherStatus.DRAFT,
      customerName: 'Tôm KID Quảng Biển',
      customerAddress: 'Đồng Nai',
      note: null,
      createdBy: { name: 'Admin' },
      items: [],
    };
    const prisma = {
      stockExport: { findUnique: vi.fn().mockResolvedValue(voucher) },
    };
    const service = new StockExportsService(prisma as never, deliveryConfig as never);

    await expect(
      Promise.all([service.downloadDeliveryFile('export-1'), service.downloadDeliveryFile('export-1')]),
    ).resolves.toHaveLength(2);
  });

  it('builds a delivery workbook from the export voucher template layout', () => {
    const workbook = buildDeliveryWorkbook(
      {
        id: 'export-1',
        code: 'PX20260708-123456',
        exportDate: new Date('2026-07-07T17:00:00.000Z'),
        exportType: ExportType.SALE,
        status: VoucherStatus.DRAFT,
        totalRevenue: 2760000,
        note: 'Giao buổi sáng',
        customerName: 'Tôm KID Quảng Biển',
        customerAddress: 'Đồng Nai',
        createdBy: { name: 'Admin' },
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 1,
            salePrice: 920000,
            product: { code: 'ZAN M', name: 'SunSum', unit: { name: 'Bao' } },
          },
          {
            id: 'item-2',
            productId: 'product-2',
            quantity: 2,
            salePrice: 920000,
            product: { code: '2XL', name: 'SunSum', unit: { name: 'Bao' } },
          },
        ],
      },
      deliveryProfile,
    );

    const sheet = workbook.getWorksheet('Phieu giao hang');

    expect(sheet?.getCell('A5').value).toBe('PHIẾU GIAO HÀNG');
    expect(sheet?.getCell('A6').value).toBe('Ngày 8 Tháng 7 Năm 2026');
    expect(sheet?.getCell('C8').value).toBe('Tôm KID Quảng Biển');
    expect(sheet?.getCell('C9').value).toBe('Đồng Nai');
    expect(sheet?.getCell('B12').value).toBe('SunSum');
    expect(sheet?.getCell('C12').value).toBe('ZAN M');
    expect(sheet?.getCell('G13').value).toBe(1840000);
    expect(sheet?.getCell('E14').value).toBe(3);
    expect(sheet?.getCell('H14').border?.bottom?.style).toBe('thin');
    expect(sheet?.getCell('A15').value).toBe('TỔNG TIỀN');
    expect(sheet?.getCell('G15').value).toBe(2760000);
    expect(sheet?.getCell('H15').border?.bottom?.style).toBe('thin');
    expect(sheet?.getCell('A16').value).toBe('Ghi chú: Giao buổi sáng');
  });
});
