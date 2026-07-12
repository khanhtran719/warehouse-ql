import { useQuery } from '@tanstack/react-query';
import { Card, DatePicker, Space, Statistic, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '../api';
import { money, qty } from '../format';
import type { TopProductRow } from '../types';

const productColumns: TableColumnsType<TopProductRow> = [
  { title: 'Mã', render: (_, row) => row.product?.code ?? '-' },
  { title: 'Tên hàng', render: (_, row) => row.product?.name ?? '-' },
  { title: 'Số lượng', render: (_, row) => qty(row.quantity) },
  { title: 'Doanh thu', render: (_, row) => money(row.revenue) },
  { title: 'Lợi nhuận', render: (_, row) => money(row.profit) },
];

export function ReportsPage() {
  const [range, setRange] = useState<[string, string]>([
    dayjs().startOf('month').toISOString(),
    dayjs().endOf('day').toISOString(),
  ]);

  const report = useQuery({ queryKey: ['report', range], queryFn: () => api.overview(range[0], range[1]) });

  return (
    <>
      <h1 className="page-title">Báo cáo doanh thu</h1>
      <div className="page-subtitle">
        Lọc theo ngày xác nhận phiếu; chỉ phiếu xuất SALE đã xác nhận được tính vào doanh thu/lợi nhuận.
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker.RangePicker
            defaultValue={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(value) => {
              if (value?.[0] && value[1]) {
                setRange([value[0].startOf('day').toISOString(), value[1].endOf('day').toISOString()]);
              }
            }}
          />
        </Space>
      </Card>

      <Space wrap size="large" style={{ marginBottom: 16 }}>
        <SummaryCard title="Tổng nhập" value={report.data?.totalImport ?? 0} />
        <SummaryCard title="Tổng bán" value={report.data?.totalRevenue ?? 0} />
        <SummaryCard title="Giá vốn" value={report.data?.totalCost ?? 0} />
        <SummaryCard title="Lợi nhuận" value={report.data?.totalProfit ?? 0} />
      </Space>

      <Card title="Top sản phẩm">
        <Table
          rowKey={(row) => row.product?.id ?? row.product?.code ?? row.product?.name ?? 'unknown'}
          loading={report.isLoading}
          dataSource={report.data?.topProducts ?? []}
          columns={productColumns}
        />
      </Card>
    </>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <Statistic title={title} value={value} formatter={money} />
    </Card>
  );
}
