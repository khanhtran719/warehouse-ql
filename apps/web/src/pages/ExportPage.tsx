import { Button, Card, DatePicker, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '../api';
import { getErrorMessage } from '../errors';

export function ExportPage() {
  const [value, setValue] = useState(dayjs());
  const [loading, setLoading] = useState(false);

  async function exportExcel() {
    setLoading(true);
    try {
      await api.exportMonthly(value.month() + 1, value.year());
      message.success('Đã tải file Excel');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Export phiếu xuất trong tháng</h1>
      <div className="page-subtitle">Xuất Excel chi tiết từng dòng hàng theo tháng xác nhận phiếu.</div>
      <Card style={{ maxWidth: 520 }}>
        <Typography.Paragraph>Chọn tháng xác nhận phiếu cần xuất dữ liệu:</Typography.Paragraph>
        <DatePicker picker="month" value={value} onChange={(nextValue) => nextValue && setValue(nextValue)} style={{ width: '100%', marginBottom: 16 }} />
        <Button type="primary" onClick={exportExcel} loading={loading}>
          Tải Excel phiếu xuất
        </Button>
      </Card>
    </>
  );
}
