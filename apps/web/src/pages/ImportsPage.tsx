import { DownloadOutlined, EditOutlined, PaperClipOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Modal, Select, Space, Table, Tag, Typography, Upload, message } from 'antd';
import type { TableColumnsType } from 'antd';
import type { UploadFile } from 'antd';
import { useDeferredValue, useMemo, useState } from 'react';
import { api } from '../api';
import { ConfirmAction } from '../components/ConfirmAction';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { money, statusLabel } from '../format';
import type { StockImport, StockImportItem, VoucherStatus } from '../types';
import { VoucherForm, type VoucherSubmit } from './VoucherForm';

const importItemColumns: TableColumnsType<StockImportItem> = [
  { title: 'Hàng', render: (_, item) => item.product?.name ?? '-' },
  { title: 'SL', dataIndex: 'quantity' },
  { title: 'Giá', render: (_, item) => money(item.unitPrice) },
  { title: 'Thành tiền', render: (_, item) => money(item.totalAmount) },
];

export function ImportsPage() {
  const [open, setOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<StockImport | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<VoucherStatus | undefined>();
  const [productSearch, setProductSearch] = useState('');
  const deferredProductSearch = useDeferredValue(productSearch);
  const [supplierSearch, setSupplierSearch] = useState('');
  const deferredSupplierSearch = useDeferredValue(supplierSearch);
  const [receiptFiles, setReceiptFiles] = useState<UploadFile[]>([]);
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ['voucher-products', deferredProductSearch],
    queryFn: () => api.products({ page: 1, pageSize: 100, search: deferredProductSearch, status: 'ACTIVE' }),
  });
  const imports = useQuery({
    queryKey: ['imports', page, pageSize, status],
    queryFn: () => api.imports({ page, pageSize, status }),
  });
  const suppliers = useQuery({
    queryKey: ['voucher-suppliers', deferredSupplierSearch],
    queryFn: () => api.suppliers({ page: 1, pageSize: 100, search: deferredSupplierSearch, status: 'ACTIVE' }),
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
    setReceiptFiles([]);
  };
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['imports'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['overview'] });
  };

  const uploadReceiptFiles = async (voucher: StockImport) => {
    const results = await Promise.allSettled(
      receiptFiles.map((file) => api.uploadImportAttachment(voucher.id, file.originFileObj as File)),
    );
    return results.filter((result) => result.status === 'rejected').length;
  };
  const createImport = useMutation({
    mutationFn: async (values: VoucherSubmit) => {
      const voucher = await api.createImport({
        importDate: values.date,
        supplierId: values.partnerId,
        supplierName: values.supplierName,
        supplierAddress: values.supplierAddress,
        supplierPhone: values.supplierPhone,
        supplierTaxCode: values.supplierTaxCode,
        note: values.note,
        items: values.items,
      });
      return { voucher, failedUploads: await uploadReceiptFiles(voucher) };
    },
    onSuccess: ({ failedUploads }) => {
      failedUploads
        ? message.warning(`Đã tạo phiếu, nhưng ${failedUploads} ảnh tải lên thất bại`)
        : message.success('Đã tạo phiếu nhập');
      closeModal();
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const updateImport = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: VoucherSubmit }) => {
      const voucher = await api.updateImport(id, {
        importDate: values.date,
        supplierId: values.partnerId,
        supplierName: values.supplierName,
        supplierAddress: values.supplierAddress,
        supplierPhone: values.supplierPhone,
        supplierTaxCode: values.supplierTaxCode,
        note: values.note,
        items: values.items,
      });
      return { voucher, failedUploads: await uploadReceiptFiles(voucher) };
    },
    onSuccess: ({ failedUploads }) => {
      failedUploads
        ? message.warning(`Đã cập nhật phiếu, nhưng ${failedUploads} ảnh tải lên thất bại`)
        : message.success('Đã cập nhật phiếu nhập');
      closeModal();
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const confirmImport = useMutation({
    mutationFn: api.confirmImport,
    onSuccess: () => {
      message.success('Đã xác nhận nhập kho');
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const cancelImport = useMutation({
    mutationFn: api.cancelImport,
    onSuccess: () => {
      message.success('Đã huỷ phiếu nhập nháp');
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<StockImport> = [
    { title: 'Mã phiếu', dataIndex: 'code' },
    { title: 'Ngày nhập', render: (_, voucher) => new Date(voucher.importDate).toLocaleDateString('vi-VN') },
    { title: 'Nhà cung cấp', dataIndex: 'supplierName', render: (value) => value || '-' },
    { title: 'Trạng thái', render: (_, voucher) => <Tag>{statusLabel(voucher.status)}</Tag> },
    { title: 'Tổng tiền', render: (_, voucher) => money(voucher.totalAmount) },
    {
      title: 'Thao tác',
      render: (_, voucher) =>
        voucher.status === 'DRAFT' ? (
          <Space wrap>
            <ConfirmAction
              title="Xác nhận phiếu nhập?"
              description="Tồn kho và giá vốn bình quân sẽ được cập nhật. Nếu sai, phải tạo điều chỉnh tồn."
              onConfirm={() => confirmImport.mutate(voucher.id)}
            >
              <Button
                size="small"
                type="primary"
                loading={confirmImport.isPending && confirmImport.variables === voucher.id}
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
            <ConfirmAction title="Huỷ phiếu nhập nháp?" onConfirm={() => cancelImport.mutate(voucher.id)}>
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                loading={cancelImport.isPending && cancelImport.variables === voucher.id}
              >
                Huỷ
              </Button>
            </ConfirmAction>
          </Space>
        ) : null,
    },
  ];

  const initialValue: VoucherSubmit | undefined = editingVoucher
    ? {
        date: editingVoucher.importDate,
        partnerId: editingVoucher.supplierId ?? undefined,
        supplierName: editingVoucher.supplierName ?? undefined,
        supplierAddress: editingVoucher.supplierAddress ?? undefined,
        supplierPhone: editingVoucher.supplierPhone ?? undefined,
        supplierTaxCode: editingVoucher.supplierTaxCode ?? undefined,
        note: editingVoucher.note ?? undefined,
        items: editingVoucher.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      }
    : undefined;
  const remainingReceiptSlots = Math.max(0, 5 - (editingVoucher?.attachments?.length ?? 0));

  return (
    <>
      <PageHeader
        title="Phiếu nhập"
        subtitle="Xác nhận phiếu nhập sẽ tăng tồn và cập nhật giá vốn bình quân. Phiếu nháp có thể sửa hoặc huỷ."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingVoucher(null);
              setOpen(true);
            }}
          >
            Tạo phiếu nhập
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
          aria-label="Lọc trạng thái phiếu nhập"
        />
        <Table
          rowKey="id"
          loading={imports.isLoading}
          dataSource={imports.data?.data ?? []}
          columns={columns}
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize,
            total: imports.data?.pagination.totalItems ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu nhập`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 20);
          }}
          expandable={{
            expandedRowRender: (voucher) => (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={voucher.items}
                  columns={importItemColumns}
                />
                <Space wrap>
                  <Typography.Text strong>Ảnh chứng từ:</Typography.Text>
                  {voucher.attachments?.length ? (
                    voucher.attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() =>
                          api
                            .downloadImportAttachment(voucher.id, attachment)
                            .catch((error) => message.error(getErrorMessage(error)))
                        }
                      >
                        {attachment.originalName}
                      </Button>
                    ))
                  ) : (
                    <Typography.Text type="secondary">Chưa có ảnh</Typography.Text>
                  )}
                </Space>
              </Space>
            ),
          }}
        />
      </Card>

      <Modal
        width={900}
        title={editingVoucher ? 'Sửa phiếu nhập' : 'Tạo phiếu nhập'}
        open={open}
        onCancel={closeModal}
        footer={null}
      >
        <Upload
          accept="image/jpeg,image/png,image/webp"
          multiple
          maxCount={remainingReceiptSlots || 1}
          disabled={remainingReceiptSlots === 0}
          fileList={receiptFiles}
          beforeUpload={(file) => {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
              message.error('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP');
              return Upload.LIST_IGNORE;
            }
            if (file.size > 8 * 1024 * 1024) {
              message.error('Mỗi ảnh không được vượt quá 8 MB');
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          onChange={({ fileList }) =>
            setReceiptFiles(remainingReceiptSlots ? fileList.slice(-remainingReceiptSlots) : [])
          }
        >
          <Button icon={<PaperClipOutlined />} disabled={remainingReceiptSlots === 0}>
            {remainingReceiptSlots ? `Chọn ảnh phiếu nhập (còn ${remainingReceiptSlots})` : 'Đã đủ 5 ảnh chứng từ'}
          </Button>
        </Upload>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          Ảnh sẽ được tải lên sau khi lưu phiếu. Hỗ trợ JPEG, PNG, WebP; tối đa 8 MB/ảnh.
        </Typography.Paragraph>
        <VoucherForm
          key={editingVoucher?.id ?? 'create-import'}
          mode="import"
          products={productOptions}
          productsLoading={products.isFetching}
          onProductSearch={setProductSearch}
          partners={suppliers.data?.data ?? []}
          partnersLoading={suppliers.isFetching}
          onPartnerSearch={setSupplierSearch}
          initialValue={initialValue}
          submitLabel={editingVoucher ? 'Lưu thay đổi' : 'Tạo phiếu nháp'}
          loading={createImport.isPending || updateImport.isPending}
          onSubmit={(values) =>
            editingVoucher ? updateImport.mutate({ id: editingVoucher.id, values }) : createImport.mutate(values)
          }
        />
      </Modal>
    </>
  );
}
