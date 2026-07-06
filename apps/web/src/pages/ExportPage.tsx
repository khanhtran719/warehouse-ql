import { Button, Card, DatePicker, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '../api';

export function ExportPage() {
  const [value, setValue] = useState(dayjs()); const [loading, setLoading] = useState(false);
  async function run() { setLoading(true); try { await api.exportMonthly(value.month()+1, value.year()); message.success('Đã tải file Excel'); } catch(e:any) { message.error(e.message); } finally { setLoading(false); } }
  return <><h1 className="page-title">Export phiếu xuất trong tháng</h1><div className="page-subtitle">Xuất Excel chi tiết từng dòng hàng của phiếu xuất đã xác nhận.</div><Card style={{ maxWidth: 520 }}><Typography.Paragraph>Chọn tháng cần xuất dữ liệu:</Typography.Paragraph><DatePicker picker="month" value={value} onChange={(v)=>v && setValue(v)} style={{ width: '100%', marginBottom: 16 }} /><Button type="primary" onClick={run} loading={loading}>Tải Excel phiếu xuất</Button></Card></>;
}
