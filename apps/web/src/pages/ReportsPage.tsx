import { Card, DatePicker, Space, Statistic, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '../api';
import { money, qty } from '../format';

export function ReportsPage() {
  const [range, setRange] = useState<[string,string]>([dayjs().startOf('month').toISOString(), dayjs().endOf('day').toISOString()]);
  const q = useQuery({ queryKey: ['report', range], queryFn: () => api.overview(range[0], range[1]) });
  return <><h1 className="page-title">Báo cáo doanh thu</h1><div className="page-subtitle">Lọc từ ngày đến ngày; chỉ phiếu xuất SALE đã xác nhận được tính vào doanh thu/lợi nhuận.</div>
  <Card style={{ marginBottom: 16 }}><Space wrap><DatePicker.RangePicker defaultValue={[dayjs(range[0]), dayjs(range[1])]} onChange={(v)=>{ if(v?.[0]&&v[1]) setRange([v[0].startOf('day').toISOString(), v[1].endOf('day').toISOString()]); }} /></Space></Card>
  <Space wrap size="large" style={{ marginBottom: 16 }}><Card><Statistic title="Tổng nhập" value={q.data?.totalImport ?? 0} formatter={money} /></Card><Card><Statistic title="Tổng bán" value={q.data?.totalRevenue ?? 0} formatter={money} /></Card><Card><Statistic title="Giá vốn" value={q.data?.totalCost ?? 0} formatter={money} /></Card><Card><Statistic title="Lợi nhuận" value={q.data?.totalProfit ?? 0} formatter={money} /></Card></Space>
  <Card title="Top sản phẩm"><Table rowKey={(r: any)=>r.product?.id} loading={q.isLoading} dataSource={q.data?.topProducts ?? []} columns={[{ title:'Mã', render:(_: unknown,r:any)=>r.product?.code }, { title:'Tên hàng', render:(_: unknown,r:any)=>r.product?.name }, { title:'Số lượng', render:(_: unknown,r:any)=>qty(r.quantity) }, { title:'Doanh thu', render:(_: unknown,r:any)=>money(r.revenue) }, { title:'Lợi nhuận', render:(_: unknown,r:any)=>money(r.profit) }]} /></Card></>;
}

