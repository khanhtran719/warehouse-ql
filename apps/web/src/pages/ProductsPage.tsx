import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import { money, qty } from '../format';
import type { Product, ProductInput } from '../types';

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
];

export function ProductsPage() {
  const [open, setOpen] = useState(false);
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Thêm hàng
            </Button>
          </Space>
        }
      />

      <Card>
        <Table rowKey="id" loading={products.isLoading} dataSource={products.data?.data ?? []} columns={productColumns} />
      </Card>

      <Modal
        title="Thêm hàng hoá"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Đóng"
        confirmLoading={createProduct.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createProduct.mutate(values)} initialValues={{ defaultSalePrice: 0, minStock: 0 }}>
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
