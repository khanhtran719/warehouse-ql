export function money(value: unknown) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value ?? 0)); }
export function qty(value: unknown) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(value ?? 0)); }
export function statusLabel(status: string) { return ({ DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã huỷ' } as Record<string,string>)[status] ?? status; }
export function exportTypeLabel(type: string) { return ({ SALE: 'Bán hàng', INTERNAL: 'Nội bộ', DAMAGE: 'Hư hỏng/mất' } as Record<string,string>)[type] ?? type; }
