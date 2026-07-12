import { ConfigService } from '@nestjs/config';
import { ExportType, VoucherStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import { getRequiredConfig } from '../config/env';
import { roundMoney, roundQty, sumLineAmount } from './inventory-math';

type Numeric = number | string | { toString(): string };

export type DeliveryCompanyProfile = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  bankAccount: string;
  bankAccountName: string;
  bankName: string;
};

export type DeliveryVoucher = {
  id: string;
  code: string;
  exportDate: Date;
  exportType: ExportType;
  status: VoucherStatus;
  customerName: string | null;
  customerAddress: string | null;
  note: string | null;
  createdBy: { name: string };
  items: Array<{
    quantity: Numeric;
    salePrice: Numeric;
    product: { code: string; name: string; unit: { name: string } | null } | null;
  }>;
};

export function readDeliveryCompanyProfile(config: ConfigService): DeliveryCompanyProfile {
  return {
    companyName: getRequiredConfig(config, 'DELIVERY_COMPANY_NAME'),
    companyAddress: getRequiredConfig(config, 'DELIVERY_COMPANY_ADDRESS'),
    companyPhone: getRequiredConfig(config, 'DELIVERY_COMPANY_PHONE'),
    bankAccount: getRequiredConfig(config, 'DELIVERY_BANK_ACCOUNT'),
    bankAccountName: getRequiredConfig(config, 'DELIVERY_BANK_ACCOUNT_NAME'),
    bankName: getRequiredConfig(config, 'DELIVERY_BANK_NAME'),
  };
}

export function buildDeliveryWorkbook(voucher: DeliveryVoucher, profile: DeliveryCompanyProfile) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Phieu giao hang');
  const exportDate = new Date(voucher.exportDate);

  sheet.columns = [
    { key: 'index', width: 7 },
    { key: 'name', width: 28 },
    { key: 'code', width: 16 },
    { key: 'unit', width: 12 },
    { key: 'quantity', width: 12 },
    { key: 'price', width: 14 },
    { key: 'amount', width: 16 },
    { key: 'note', width: 18 },
  ];

  ['A1:D1', 'F1:H1', 'A2:D2', 'F2:H2', 'A3:D3', 'F3:H3', 'A5:H5', 'A6:H6', 'A8:B8', 'C8:H8', 'A9:B9', 'C9:H9'].forEach(
    (range) => sheet.mergeCells(range),
  );
  sheet.getCell('A1').value = profile.companyName;
  sheet.getCell('A2').value = `Đ/C: ${profile.companyAddress}`;
  sheet.getCell('A3').value = `ĐT/Zalo: ${profile.companyPhone}`;
  sheet.getCell('F1').value = `TK: ${profile.bankAccount}`;
  sheet.getCell('F2').value = profile.bankAccountName;
  sheet.getCell('F3').value = profile.bankName;
  sheet.getCell('A5').value = 'PHIẾU GIAO HÀNG';
  sheet.getCell('A6').value = formatDeliveryDate(exportDate);
  sheet.getCell('A8').value = 'Khách hàng:';
  sheet.getCell('C8').value = voucher.customerName ?? '';
  sheet.getCell('A9').value = 'Địa chỉ:';
  sheet.getCell('C9').value = voucher.customerAddress ?? '';

  sheet.getRow(11).values = ['STT', 'TÊN HÀNG HÓA', 'MÃ HÀNG', 'ĐVT', 'SỐ LƯỢNG', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'GHI CHÚ'];
  let totalQuantity = 0;
  let totalAmount = 0;
  voucher.items.forEach((item, index) => {
    const quantity = Number(item.quantity);
    const salePrice = Number(item.salePrice);
    const amount = voucher.exportType === ExportType.SALE ? sumLineAmount(quantity, salePrice) : 0;
    totalQuantity = roundQty(totalQuantity + quantity);
    totalAmount = roundMoney(totalAmount + amount);
    sheet.addRow({
      index: index + 1,
      name: item.product?.name ?? '',
      code: item.product?.code ?? '',
      unit: item.product?.unit?.name ?? '',
      quantity,
      price: salePrice,
      amount,
      note: '',
    });
  });

  const totalQuantityRowNumber = 12 + voucher.items.length;
  sheet.getCell(`E${totalQuantityRowNumber}`).value = totalQuantity;
  const totalAmountRowNumber = totalQuantityRowNumber + 1;
  sheet.mergeCells(`A${totalAmountRowNumber}:F${totalAmountRowNumber}`);
  sheet.getCell(`A${totalAmountRowNumber}`).value = 'TỔNG TIỀN';
  sheet.getCell(`G${totalAmountRowNumber}`).value = totalAmount;
  sheet.getCell(`G${totalAmountRowNumber}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
  const noteRowNumber = totalAmountRowNumber + 1;
  sheet.mergeCells(`A${noteRowNumber}:H${noteRowNumber}`);
  sheet.getCell(`A${noteRowNumber}`).value = voucher.note ? `Ghi chú: ${voucher.note}` : '';
  const signatureRowNumber = noteRowNumber + 2;
  sheet.mergeCells(`A${signatureRowNumber}:C${signatureRowNumber}`);
  sheet.mergeCells(`F${signatureRowNumber}:H${signatureRowNumber}`);
  sheet.getCell(`A${signatureRowNumber}`).value = 'Người giao hàng';
  sheet.getCell(`F${signatureRowNumber}`).value = 'Người nhận hàng';
  sheet.getCell(`A${signatureRowNumber + 4}`).value = voucher.createdBy.name;

  styleDeliverySheet(sheet, totalAmountRowNumber, noteRowNumber, signatureRowNumber);
  return workbook;
}

function styleDeliverySheet(
  sheet: ExcelJS.Worksheet,
  totalAmountRowNumber: number,
  noteRowNumber: number,
  signatureRowNumber: number,
) {
  ['A1', 'A2', 'A3', 'F1', 'F2', 'F3'].forEach((cell) => {
    sheet.getCell(cell).font = { bold: true, italic: cell.startsWith('F') };
  });
  sheet.getCell('A5').font = { bold: true, size: 18 };
  sheet.getCell('A5').alignment = { horizontal: 'center' };
  sheet.getCell('A6').alignment = { horizontal: 'center' };
  sheet.getCell('A8').font = { bold: true };
  sheet.getCell('A9').font = { bold: true };
  sheet.getRow(11).font = { bold: true };
  sheet.getRow(11).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  for (let rowNumber = 11; rowNumber <= totalAmountRowNumber; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = rowNumber === 11 ? 28 : 22;
    for (let columnNumber = 1; columnNumber <= 8; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
  }

  sheet.getColumn('B').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  sheet.getColumn('F').numFmt = '#,##0';
  sheet.getColumn('G').numFmt = '#,##0';
  sheet.getCell(`A${totalAmountRowNumber}`).font = { bold: true };
  sheet.getCell(`A${totalAmountRowNumber}`).alignment = { horizontal: 'center' };
  sheet.getCell(`G${totalAmountRowNumber}`).font = { bold: true, color: { argb: 'FFFF0000' }, size: 14 };
  sheet.getCell(`A${noteRowNumber}`).alignment = { wrapText: true };
  sheet.getCell(`A${signatureRowNumber}`).font = { bold: true };
  sheet.getCell(`F${signatureRowNumber}`).font = { bold: true };
  sheet.getCell(`A${signatureRowNumber}`).alignment = { horizontal: 'center' };
  sheet.getCell(`F${signatureRowNumber}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${signatureRowNumber + 4}`).alignment = { horizontal: 'center' };
}

export function deliveryFileName(code: string) {
  return `phieu-giao-hang-${code.replace(/[^a-zA-Z0-9._-]/g, '-')}.xlsx`;
}

function formatDeliveryDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `Ngày ${value('day')} Tháng ${value('month')} Năm ${value('year')}`;
}
