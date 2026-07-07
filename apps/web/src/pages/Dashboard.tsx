import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { money, qty } from '../format';
import type { Product, TopProductRow } from '../types';

const topProductColumns: TableColumnsType<TopProductRow> = [
  { title: 'Hàng', render: (_, row) => row.product?.name ?? '-' },
  { title: 'SL', render: (_, row) => qty(row.quantity) },
  { title: 'LN', render: (_, row) => money(row.profit) },
];

const lowStockColumns: TableColumnsType<Product> = [
  { title: 'Mã hàng', dataIndex: 'code' },
  { title: 'Tên hàng', dataIndex: 'name' },
  { title: 'Tồn', render: (_, product) => qty(product.currentStock) },
  { title: 'Tồn tối thiểu', render: (_, product) => qty(product.minStock) },
];

export function Dashboard() {
  const from = dayjs().startOf('month').toISOString();
  const to = dayjs().endOf('day').toISOString();

  const overview = useQuery({ queryKey: ['overview', from, to], queryFn: () => api.overview(from, to) });
  const daily = useQuery({ queryKey: ['daily', from, to], queryFn: () => api.daily(from, to) });
  const overviewData = overview.data;

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <div className="page-subtitle">Tổng quan tháng hiện tại: nhập kho, bán hàng và lợi nhuận.</div>

      <Row gutter={[16, 16]}>
        <MetricCard title="Tổng tiền nhập" value={overviewData?.totalImport ?? 0} />
        <MetricCard title="Tổng tiền bán" value={overviewData?.totalRevenue ?? 0} />
        <MetricCard title="Giá vốn" value={overviewData?.totalCost ?? 0} />
        <MetricCard title="Lợi nhuận" value={overviewData?.totalProfit ?? 0} valueStyle={{ color: '#047857' }} />
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={15}>
          <Card title="Doanh thu / lợi nhuận theo ngày" loading={daily.isLoading}>
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={daily.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#1f2937" />
                  <Bar dataKey="profit" name="Lợi nhuận" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="Top sản phẩm bán chạy">
            <Table rowKey={(row) => row.product?.id ?? row.product?.code ?? row.product?.name ?? 'unknown'} size="small" pagination={false} dataSource={overviewData?.topProducts ?? []} columns={topProductColumns} />
          </Card>
        </Col>
      </Row>

      <Card title="Cảnh báo tồn thấp" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          loading={overview.isLoading}
          dataSource={overviewData?.lowStock ?? []}
          pagination={false}
          columns={lowStockColumns}
          locale={{ emptyText: <Typography.Text type="secondary">Chưa có sản phẩm dưới tồn tối thiểu.</Typography.Text> }}
        />
      </Card>
    </>
  );
}

function MetricCard({ title, value, valueStyle }: { title: string; value: number; valueStyle?: React.CSSProperties }) {
  return (
    <Col xs={24} md={12} xl={6}>
      <Card className="metric-card">
        <Statistic title={title} value={value} formatter={money} valueStyle={valueStyle} />
      </Card>
    </Col>
  );
}
