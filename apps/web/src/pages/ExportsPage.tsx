import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Modal, Space, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { exportTypeLabel, money, statusLabel } from '../format';
import type { StockExport, StockExportItem } from '../types';
import { VoucherForm, type VoucherSubmit } from './VoucherForm';

const exportItemColumns: TableColumnsType<StockExportItem> = [
  { title: 'Hàng', render: (_, item) => item.product?.name ?? '-' },
  { title: 'SL', dataIndex: 'quantity' },
  { title: 'Giá bán', render: (_, item) => money(item.salePrice) },
  { title: 'Giá vốn', render: (_, item) => money(item.costPrice) },
  { title: 'LN', render: (_, item) => money(item.profitAmount) },
];

export function ExportsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['products'], queryFn: () => api.products('?pageSize=100') });
  const exportsQuery = useQuery({ queryKey: ['exports'], queryFn: api.exports });

  const createExport = useMutation({
    mutationFn: (values: VoucherSubmit) =>
      api.createExport({
        exportDate: values.date,
        exportType: values.exportType ?? 'SALE',
        note: values.note,
        items: values.items,
      }),
    onSuccess: () => {
      message.success('Đã tạo phiếu xuất');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const confirmExport = useMutation({
    mutationFn: api.confirmExport,
    onSuccess: () => {
      message.success('Đã xác nhận xuất kho');
      queryClient.invalidateQueries();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<StockExport> = [
    { title: 'Mã phiếu', dataIndex: 'code' },
    { title: 'Ngày xuất', render: (_, voucher) => new Date(voucher.exportDate).toLocaleDateString('vi-VN') },
    { title: 'Loại', render: (_, voucher) => exportTypeLabel(voucher.exportType) },
    { title: 'Trạng thái', render: (_, voucher) => <Tag>{statusLabel(voucher.status)}</Tag> },
    { title: 'Doanh thu', render: (_, voucher) => money(voucher.totalRevenue) },
    { title: 'Giá vốn', render: (_, voucher) => money(voucher.totalCost) },
    { title: 'Lợi nhuận', render: (_, voucher) => money(voucher.totalProfit) },
    {
      title: 'Thao tác',
      render: (_, voucher) => (
        <Space>
          {voucher.status === 'DRAFT' && (
            <Button size="small" type="primary" onClick={() => confirmExport.mutate(voucher.id)}>
              Xác nhận
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Phiếu xuất"
        subtitle="Xác nhận phiếu xuất sẽ trừ tồn, snapshot giá vốn và tính lợi nhuận."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Tạo phiếu xuất
          </Button>
        }
      />

      <Card>
        <Table
          rowKey="id"
          loading={exportsQuery.isLoading}
          dataSource={exportsQuery.data?.data ?? []}
          columns={columns}
          expandable={{
            expandedRowRender: (voucher) => (
              <Table rowKey="id" size="small" pagination={false} dataSource={voucher.items} columns={exportItemColumns} />
            ),
          }}
        />
      </Card>

      <Modal width={820} title="Tạo phiếu xuất" open={open} onCancel={() => setOpen(false)} footer={null}>
        <VoucherForm mode="export" products={products.data?.data ?? []} loading={createExport.isPending} onSubmit={(values) => createExport.mutate(values)} />
      </Modal>
    </>
  );
}
