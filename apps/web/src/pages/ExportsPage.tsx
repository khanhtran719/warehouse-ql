import { DownloadOutlined, EditOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';
import { api } from '../api';
import { ConfirmAction } from '../components/ConfirmAction';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { exportTypeLabel, money, statusLabel } from '../format';
import type { StockExport, StockExportItem, VoucherStatus } from '../types';
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
  const [editingVoucher, setEditingVoucher] = useState<StockExport | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<VoucherStatus | undefined>();
  const [productSearch, setProductSearch] = useState('');
  const deferredProductSearch = useDeferredValue(productSearch);
  const [customerSearch, setCustomerSearch] = useState('');
  const deferredCustomerSearch = useDeferredValue(customerSearch);
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ['voucher-products', deferredProductSearch],
    queryFn: () => api.products({ page: 1, pageSize: 100, search: deferredProductSearch, status: 'ACTIVE' }),
  });
  const exportsQuery = useQuery({
    queryKey: ['exports', page, pageSize, status],
    queryFn: () => api.exports({ page, pageSize, status }),
  });
  const customers = useQuery({
    queryKey: ['voucher-customers', deferredCustomerSearch],
    queryFn: () => api.customers({ page: 1, pageSize: 100, search: deferredCustomerSearch, status: 'ACTIVE' }),
  });
  const productOptions = useMemo(() => {
    const byId = new Map((products.data?.data ?? []).map((product) => [product.id, product]));
    editingVoucher?.items.forEach((item) => {
      if (item.product) byId.set(item.product.id, item.product);
    });
    return [...byId.values()];
  }, [editingVoucher, products.data?.data]);

  const closeModal = () => {
    setOpen(false);
    setEditingVoucher(null);
  };
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['exports'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
  };
  const toInput = (values: VoucherSubmit) => ({
    exportDate: values.date,
    exportType: values.exportType ?? ('SALE' as const),
    customerId: values.partnerId,
    customerName: values.customerName,
    customerAddress: values.customerAddress,
    customerPhone: values.customerPhone,
    customerTaxCode: values.customerTaxCode,
    note: values.note,
    items: values.items,
  });

  const createExport = useMutation({
    mutationFn: (values: VoucherSubmit) => api.createExport(toInput(values)),
    onSuccess: () => {
      message.success('Đã tạo phiếu xuất');
      closeModal();
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const updateExport = useMutation({
    mutationFn: ({ id, values }: { id: string; values: VoucherSubmit }) => api.updateExport(id, toInput(values)),
    onSuccess: () => {
      message.success('Đã cập nhật phiếu xuất');
      closeModal();
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const confirmExport = useMutation({
    mutationFn: api.confirmExport,
    onSuccess: () => {
      message.success('Đã xác nhận xuất kho');
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const cancelExport = useMutation({
    mutationFn: api.cancelExport,
    onSuccess: () => {
      message.success('Đã huỷ phiếu xuất nháp');
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const downloadExportFile = useMutation({
    mutationFn: (voucher: Pick<StockExport, 'id' | 'code'>) => api.downloadExportFile(voucher.id, voucher.code),
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<StockExport> = [
    { title: 'Mã phiếu', dataIndex: 'code' },
    { title: 'Ngày xuất', render: (_, voucher) => new Date(voucher.exportDate).toLocaleDateString('vi-VN') },
    { title: 'Khách hàng', dataIndex: 'customerName', render: (value) => value || '-' },
    { title: 'Loại', render: (_, voucher) => exportTypeLabel(voucher.exportType) },
    { title: 'Trạng thái', render: (_, voucher) => <Tag>{statusLabel(voucher.status)}</Tag> },
    { title: 'Doanh thu', render: (_, voucher) => money(voucher.totalRevenue) },
    { title: 'Giá vốn', render: (_, voucher) => money(voucher.totalCost) },
    { title: 'Lợi nhuận', render: (_, voucher) => money(voucher.totalProfit) },
    {
      title: 'Thao tác',
      render: (_, voucher) => (
        <Space wrap>
          {voucher.status === 'DRAFT' && (
            <>
              <ConfirmAction
                title="Xác nhận phiếu xuất?"
                description="Tồn kho sẽ bị trừ và giá vốn/lợi nhuận được snapshot. Nếu sai, phải tạo điều chỉnh tồn."
                onConfirm={() => confirmExport.mutate(voucher.id)}
              >
                <Button
                  size="small"
                  type="primary"
                  loading={confirmExport.isPending && confirmExport.variables === voucher.id}
                >
                  Xác nhận
                </Button>
              </ConfirmAction>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingVoucher(voucher);
                  setOpen(true);
                }}
              >
                Sửa
              </Button>
              <ConfirmAction title="Huỷ phiếu xuất nháp?" onConfirm={() => cancelExport.mutate(voucher.id)}>
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={cancelExport.isPending && cancelExport.variables === voucher.id}
                >
                  Huỷ
                </Button>
              </ConfirmAction>
            </>
          )}
          {voucher.status !== 'CANCELLED' && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadExportFile.isPending && downloadExportFile.variables?.id === voucher.id}
              onClick={() => downloadExportFile.mutate({ id: voucher.id, code: voucher.code })}
            >
              Tải file
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const initialValue: VoucherSubmit | undefined = editingVoucher
    ? {
        date: editingVoucher.exportDate,
        exportType: editingVoucher.exportType,
        partnerId: editingVoucher.customerId ?? undefined,
        customerName: editingVoucher.customerName ?? undefined,
        customerAddress: editingVoucher.customerAddress ?? undefined,
        customerPhone: editingVoucher.customerPhone ?? undefined,
        customerTaxCode: editingVoucher.customerTaxCode ?? undefined,
        note: editingVoucher.note ?? undefined,
        items: editingVoucher.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.salePrice),
        })),
      }
    : undefined;

  return (
    <>
      <PageHeader
        title="Phiếu xuất"
        subtitle="Xác nhận phiếu xuất sẽ trừ tồn, snapshot giá vốn và tính lợi nhuận. Phiếu nháp có thể sửa hoặc huỷ."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingVoucher(null);
              setOpen(true);
            }}
          >
            Tạo phiếu xuất
          </Button>
        }
      />
      <Card>
        <Select
          allowClear
          placeholder="Lọc trạng thái"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'DRAFT', label: 'Nháp' },
            { value: 'CONFIRMED', label: 'Đã xác nhận' },
            { value: 'CANCELLED', label: 'Đã huỷ' },
          ]}
          style={{ width: 200, marginBottom: 16 }}
          aria-label="Lọc trạng thái phiếu xuất"
        />
        <Table
          rowKey="id"
          loading={exportsQuery.isLoading}
          dataSource={exportsQuery.data?.data ?? []}
          columns={columns}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: exportsQuery.data?.pagination.totalItems ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu xuất`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 20);
          }}
          expandable={{
            expandedRowRender: (voucher) => (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={voucher.items}
                columns={exportItemColumns}
              />
            ),
          }}
        />
      </Card>

      <Modal
        width={900}
        title={editingVoucher ? 'Sửa phiếu xuất' : 'Tạo phiếu xuất'}
        open={open}
        onCancel={closeModal}
        footer={null}
      >
        <VoucherForm
          key={editingVoucher?.id ?? 'create-export'}
          mode="export"
          products={productOptions}
          productsLoading={products.isFetching}
          onProductSearch={setProductSearch}
          partners={customers.data?.data ?? []}
          partnersLoading={customers.isFetching}
          onPartnerSearch={setCustomerSearch}
          initialValue={initialValue}
          submitLabel={editingVoucher ? 'Lưu thay đổi' : 'Tạo phiếu nháp'}
          loading={createExport.isPending || updateExport.isPending}
          onSubmit={(values) =>
            editingVoucher ? updateExport.mutate({ id: editingVoucher.id, values }) : createExport.mutate(values)
          }
        />
      </Modal>
    </>
  );
}
