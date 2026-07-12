import {
  AuditOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useDeferredValue, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { money, qty } from '../format';
import type { Product, ProductInput, StockMovement } from '../types';

type ProductsPageProps = { canManage: boolean };
type AdjustmentForm = { targetStock: number; reason: string };

export function ProductsPage({ canManage }: ProductsPageProps) {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [form] = Form.useForm<ProductInput>();
  const [adjustmentForm] = Form.useForm<AdjustmentForm>();
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ['products', page, pageSize, deferredSearch],
    queryFn: () => api.products({ page, pageSize, search: deferredSearch }),
  });
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: canManage });
  const units = useQuery({ queryKey: ['units'], queryFn: api.units, enabled: canManage });
  const movements = useQuery({
    queryKey: ['product-movements', movementProduct?.id],
    queryFn: () => api.productMovements(movementProduct!.id),
    enabled: Boolean(movementProduct),
  });

  const createProduct = useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      message.success('Đã tạo hàng hoá');
      closeProductModal();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductInput }) => api.updateProduct(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật hàng hoá');
      closeProductModal();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustmentForm }) => api.adjustStock(id, data),
    onSuccess: () => {
      message.success('Đã ghi nhận điều chỉnh tồn kho');
      setAdjustingProduct(null);
      adjustmentForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const productColumns: TableColumnsType<Product> = [
    { title: 'Mã', dataIndex: 'code' },
    { title: 'Tên hàng', dataIndex: 'name' },
    { title: 'Nhóm', render: (_, product) => product.category?.name ?? '-' },
    { title: 'ĐVT', render: (_, product) => product.unit?.name ?? '-' },
    {
      title: 'Tồn',
      render: (_, product) => (
        <Tag color={Number(product.currentStock) <= Number(product.minStock) ? 'red' : 'green'}>
          {qty(product.currentStock)}
        </Tag>
      ),
    },
    { title: 'Giá vốn BQ', render: (_, product) => money(product.averageCost) },
    { title: 'Giá bán', render: (_, product) => money(product.defaultSalePrice) },
    ...(canManage
      ? [
          {
            title: 'Thao tác',
            render: (_: unknown, product: Product) => (
              <Space wrap>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(product)}>
                  Sửa
                </Button>
                <Button size="small" icon={<AuditOutlined />} onClick={() => openAdjustment(product)}>
                  Điều chỉnh tồn
                </Button>
              </Space>
            ),
          },
        ]
      : []),
    {
      title: 'Lịch sử',
      render: (_, product) => (
        <Button size="small" icon={<HistoryOutlined />} onClick={() => setMovementProduct(product)}>
          Movement
        </Button>
      ),
    },
  ];

  function openCreate() {
    setEditingProduct(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    form.setFieldsValue({
      code: product.code,
      name: product.name,
      categoryId: product.categoryId ?? product.category?.id,
      unitId: product.unitId ?? product.unit?.id,
      defaultSalePrice: Number(product.defaultSalePrice),
      minStock: Number(product.minStock),
      note: product.note ?? undefined,
    });
    setOpen(true);
  }

  function openAdjustment(product: Product) {
    setAdjustingProduct(product);
    adjustmentForm.setFieldsValue({ targetStock: Number(product.currentStock), reason: '' });
  }

  function closeProductModal() {
    setOpen(false);
    setEditingProduct(null);
    form.resetFields();
  }

  function submitProduct(values: ProductInput) {
    const data = { ...values, categoryId: values.categoryId ?? null, unitId: values.unitId ?? null };
    if (editingProduct) updateProduct.mutate({ id: editingProduct.id, data });
    else createProduct.mutate(data);
  }

  return (
    <>
      <PageHeader
        title="Hàng hoá"
        subtitle="Tra cứu hàng hoá, tồn hiện tại và giá vốn bình quân. Điều chỉnh tồn được lưu vào sổ movement."
        actions={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => products.refetch()}>
              Tải lại
            </Button>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Thêm hàng
              </Button>
            )}
          </Space>
        }
      />

      <Card>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo mã hoặc tên hàng"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 360, marginBottom: 16 }}
          aria-label="Tìm hàng hoá"
        />
        <Table
          rowKey="id"
          loading={products.isLoading}
          dataSource={products.data?.data ?? []}
          columns={productColumns}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total: products.data?.pagination.totalItems ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} hàng hoá`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 20);
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? 'Sửa hàng hoá' : 'Thêm hàng hoá'}
        open={open}
        onCancel={closeProductModal}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Đóng"
        confirmLoading={createProduct.isPending || updateProduct.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={submitProduct}
          initialValues={{ defaultSalePrice: 0, minStock: 0 }}
        >
          <div className="form-grid">
            <Form.Item name="code" label="Mã hàng" rules={[{ required: true, message: 'Nhập mã hàng' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="name" label="Tên hàng" rules={[{ required: true, message: 'Nhập tên hàng' }]}>
              <Input />
            </Form.Item>
          </div>
          <div className="form-grid">
            <Form.Item name="categoryId" label="Nhóm hàng">
              <Select
                allowClear
                options={(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))}
              />
            </Form.Item>
            <Form.Item name="unitId" label="Đơn vị">
              <Select allowClear options={(units.data ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
            </Form.Item>
          </div>
          <div className="form-grid">
            <Form.Item name="defaultSalePrice" label="Giá bán mặc định" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="minStock" label="Tồn tối thiểu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        width={900}
        title={`Lịch sử tồn · ${movementProduct?.code ?? ''}`}
        open={Boolean(movementProduct)}
        onCancel={() => setMovementProduct(null)}
        footer={null}
      >
        <Table<StockMovement>
          rowKey="id"
          size="small"
          loading={movements.isLoading}
          dataSource={movements.data ?? []}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Thời gian', render: (_, row) => new Date(row.createdAt).toLocaleString('vi-VN') },
            { title: 'Loại', dataIndex: 'movementType' },
            { title: 'Thay đổi', render: (_, row) => qty(row.quantityChange) },
            { title: 'Trước', render: (_, row) => qty(row.stockBefore) },
            { title: 'Sau', render: (_, row) => qty(row.stockAfter) },
            { title: 'Tham chiếu', dataIndex: 'note' },
          ]}
        />
      </Modal>

      <Modal
        title={`Điều chỉnh tồn · ${adjustingProduct?.code ?? ''}`}
        open={Boolean(adjustingProduct)}
        onCancel={() => setAdjustingProduct(null)}
        onOk={() => adjustmentForm.submit()}
        okText="Ghi nhận điều chỉnh"
        cancelText="Đóng"
        confirmLoading={adjustStock.isPending}
      >
        <p>
          Tồn hệ thống hiện tại: <strong>{qty(adjustingProduct?.currentStock)}</strong>. Thao tác này tạo một movement
          audit và không sửa lịch sử phiếu nhập/xuất.
        </p>
        <Form
          form={adjustmentForm}
          layout="vertical"
          onFinish={(values) => adjustingProduct && adjustStock.mutate({ id: adjustingProduct.id, data: values })}
        >
          <Form.Item name="targetStock" label="Tồn thực tế" rules={[{ required: true }]}>
            <InputNumber min={0} precision={3} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do điều chỉnh"
            rules={[{ required: true, min: 3, message: 'Nhập lý do ít nhất 3 ký tự' }]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
