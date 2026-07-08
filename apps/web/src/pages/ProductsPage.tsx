import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { money, qty } from '../format';
import type { Product, ProductInput } from '../types';

export function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm<ProductInput>();
  const queryClient = useQueryClient();

  const products = useQuery({ queryKey: ['products'], queryFn: () => api.products('?pageSize=100') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const units = useQuery({ queryKey: ['units'], queryFn: api.units });

  const createProduct = useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      message.success('Đã tạo hàng hoá');
      setOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductInput }) => api.updateProduct(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật hàng hoá');
      setOpen(false);
      setEditingProduct(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
    {
      title: 'Thao tác',
      render: (_, product) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(product)}>
          Sửa
        </Button>
      ),
    },
  ];

  const openCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.resetFields();
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
  };

  const closeModal = () => {
    setOpen(false);
    setEditingProduct(null);
  };

  const submitProduct = (values: ProductInput) => {
    const data = { ...values, categoryId: values.categoryId ?? null, unitId: values.unitId ?? null };

    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data });
      return;
    }

    createProduct.mutate(data);
  };

  return (
    <>
      <PageHeader
        title="Hàng hoá"
        subtitle="Quản lý mã hàng, giá bán, giá vốn bình quân và tồn hiện tại."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => products.refetch()}>
              Tải lại
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm hàng
            </Button>
          </Space>
        }
      />

      <Card>
        <Table rowKey="id" loading={products.isLoading} dataSource={products.data?.data ?? []} columns={productColumns} />
      </Card>

      <Modal
        title={editingProduct ? 'Sửa hàng hoá' : 'Thêm hàng hoá'}
        open={open}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Đóng"
        confirmLoading={createProduct.isPending || updateProduct.isPending}
      >
        <Form form={form} layout="vertical" onFinish={submitProduct} initialValues={{ defaultSalePrice: 0, minStock: 0 }}>
          <div className="form-grid">
            <Form.Item name="code" label="Mã hàng" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="name" label="Tên hàng" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item name="categoryId" label="Nhóm hàng">
              <Select allowClear options={(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))} />
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
    </>
  );
}
