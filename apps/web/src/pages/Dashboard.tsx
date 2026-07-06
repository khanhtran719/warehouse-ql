import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { money, qty } from '../format';

export function Dashboard() {
  const from = dayjs().startOf('month').toISOString();
  const to = dayjs().endOf('day').toISOString();
  const overview = useQuery({ queryKey: ['overview', from, to], queryFn: () => api.overview(from, to) });
  const daily = useQuery({ queryKey: ['daily', from, to], queryFn: () => api.daily(from, to) });
  const data = overview.data;
  return <>
    <h1 className="page-title">Dashboard</h1><div className="page-subtitle">Tổng quan tháng hiện tại: nhập kho, bán hàng và lợi nhuận.</div>
    <Row gutter={[16,16]}>
      <Col xs={24} md={12} xl={6}><Card className="metric-card"><Statistic title="Tổng tiền nhập" value={data?.totalImport ?? 0} formatter={money} /></Card></Col>
      <Col xs={24} md={12} xl={6}><Card className="metric-card"><Statistic title="Tổng tiền bán" value={data?.totalRevenue ?? 0} formatter={money} /></Card></Col>
      <Col xs={24} md={12} xl={6}><Card className="metric-card"><Statistic title="Giá vốn" value={data?.totalCost ?? 0} formatter={money} /></Card></Col>
      <Col xs={24} md={12} xl={6}><Card className="metric-card"><Statistic title="Lợi nhuận" value={data?.totalProfit ?? 0} formatter={money} valueStyle={{ color: '#047857' }} /></Card></Col>
    </Row>
    <Row gutter={[16,16]} style={{ marginTop: 16 }}>
      <Col xs={24} lg={15}><Card title="Doanh thu / lợi nhuận theo ngày" loading={daily.isLoading}><div style={{ height: 320 }}><ResponsiveContainer><BarChart data={daily.data ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(v) => `${Math.round(Number(v)/1000)}k`} /><Tooltip formatter={(v) => money(v)} /><Bar dataKey="revenue" name="Doanh thu" fill="#1f2937" /><Bar dataKey="profit" name="Lợi nhuận" fill="#059669" /></BarChart></ResponsiveContainer></div></Card></Col>
      <Col xs={24} lg={9}><Card title="Top sản phẩm bán chạy"><Table rowKey={(r: any) => r.product?.id} size="small" pagination={false} dataSource={data?.topProducts ?? []} columns={[{ title: 'Hàng', render: (_: unknown, r: any) => r.product?.name }, { title: 'SL', render: (_: unknown, r: any) => qty(r.quantity) }, { title: 'LN', render: (_: unknown, r: any) => money(r.profit) }]} /></Card></Col>
    </Row>
    <Card title="Cảnh báo tồn thấp" style={{ marginTop: 16 }}><Table rowKey="id" loading={overview.isLoading} dataSource={data?.lowStock ?? []} pagination={false} columns={[{ title: 'Mã hàng', dataIndex: 'code' }, { title: 'Tên hàng', dataIndex: 'name' }, { title: 'Tồn', render: (_: unknown, r: any) => qty(r.currentStock) }, { title: 'Tồn tối thiểu', render: (_: unknown, r: any) => qty(r.minStock) }]} locale={{ emptyText: <Typography.Text type="secondary">Chưa có sản phẩm dưới tồn tối thiểu.</Typography.Text> }} /></Card>
  </>;
}

