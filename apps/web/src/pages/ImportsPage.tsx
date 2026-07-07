import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Modal, Space, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { money, statusLabel } from '../format';
import type { StockImport, StockImportItem } from '../types';
import { VoucherForm, type VoucherSubmit } from './VoucherForm';

const importItemColumns: TableColumnsType<StockImportItem> = [
  { title: 'Hàng', render: (_, item) => item.product?.name ?? '-' },
  { title: 'SL', dataIndex: 'quantity' },
  { title: 'Giá', render: (_, item) => money(item.unitPrice) },
  { title: 'Thành tiền', render: (_, item) => money(item.totalAmount) },
];

export function ImportsPage() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['products'], queryFn: () => api.products('?pageSize=100') });
  const imports = useQuery({ queryKey: ['imports'], queryFn: api.imports });

  const createImport = useMutation({
    mutationFn: (values: VoucherSubmit) =>
      api.createImport({ importDate: values.date, note: values.note, items: values.items }),
    onSuccess: () => {
      message.success('Đã tạo phiếu nhập');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const confirmImport = useMutation({
    mutationFn: api.confirmImport,
    onSuccess: () => {
      message.success('Đã xác nhận nhập kho');
      queryClient.invalidateQueries();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<StockImport> = [
    { title: 'Mã phiếu', dataIndex: 'code' },
    { title: 'Ngày nhập', render: (_, voucher) => new Date(voucher.importDate).toLocaleDateString('vi-VN') },
    { title: 'Trạng thái', render: (_, voucher) => <Tag>{statusLabel(voucher.status)}</Tag> },
    { title: 'Tổng tiền', render: (_, voucher) => money(voucher.totalAmount) },
    {
      title: 'Thao tác',
      render: (_, voucher) => (
        <Space>
          {voucher.status === 'DRAFT' && (
            <Button size="small" type="primary" onClick={() => confirmImport.mutate(voucher.id)}>
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
        title="Phiếu nhập"
        subtitle="Xác nhận phiếu nhập sẽ tăng tồn và cập nhật giá vốn bình quân."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Tạo phiếu nhập
          </Button>
        }
      />

      <Card>
        <Table
          rowKey="id"
          loading={imports.isLoading}
          dataSource={imports.data?.data ?? []}
          columns={columns}
          expandable={{
            expandedRowRender: (voucher) => (
              <Table rowKey="id" size="small" pagination={false} dataSource={voucher.items} columns={importItemColumns} />
            ),
          }}
        />
      </Card>

      <Modal width={820} title="Tạo phiếu nhập" open={open} onCancel={() => setOpen(false)} footer={null}>
        <VoucherForm mode="import" products={products.data?.data ?? []} loading={createImport.isPending} onSubmit={(values) => createImport.mutate(values)} />
      </Modal>
    </>
  );
}
