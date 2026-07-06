import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { money, qty } from '../format';
import type { Product } from '../types';

export function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.products('?pageSize=100') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const units = useQuery({ queryKey: ['units'], queryFn: api.units });
  const create = useMutation({ mutationFn: api.createProduct, onSuccess: () => { message.success('Đã tạo hàng hoá'); setOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ['products'] }); }, onError: (e) => message.error(e.message) });
  return <>
    <div className="toolbar"><div><h1 className="page-title">Hàng hoá</h1><div className="page-subtitle">Quản lý mã hàng, giá bán, giá vốn bình quân và tồn hiện tại.</div></div><Space><Button icon={<ReloadOutlined />} onClick={() => products.refetch()}>Tải lại</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Thêm hàng</Button></Space></div>
    <Card><Table rowKey="id" loading={products.isLoading} dataSource={products.data?.data ?? []} columns={[{ title: 'Mã', dataIndex: 'code' }, { title: 'Tên hàng', dataIndex: 'name' }, { title: 'Nhóm', render: (_, r: Product) => r.category?.name ?? '-' }, { title: 'ĐVT', render: (_, r: Product) => r.unit?.name ?? '-' }, { title: 'Tồn', render: (_, r: Product) => <Tag color={Number(r.currentStock) <= Number(r.minStock) ? 'red' : 'green'}>{qty(r.currentStock)}</Tag> }, { title: 'Giá vốn BQ', render: (_, r: Product) => money(r.averageCost) }, { title: 'Giá bán', render: (_, r: Product) => money(r.defaultSalePrice) }]} /></Card>
    <Modal title="Thêm hàng hoá" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Lưu" cancelText="Đóng" confirmLoading={create.isPending}>
      <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)} initialValues={{ defaultSalePrice: 0, minStock: 0 }}>
        <div className="form-grid"><Form.Item name="code" label="Mã hàng" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="name" label="Tên hàng" rules={[{ required: true }]}><Input /></Form.Item></div>
        <div className="form-grid"><Form.Item name="categoryId" label="Nhóm hàng"><Select allowClear options={(categories.data ?? []).map((x:any)=>({ value:x.id, label:x.name }))} /></Form.Item><Form.Item name="unitId" label="Đơn vị"><Select allowClear options={(units.data ?? []).map((x:any)=>({ value:x.id, label:x.name }))} /></Form.Item></div>
        <div className="form-grid"><Form.Item name="defaultSalePrice" label="Giá bán mặc định" rules={[{ required: true }]}><InputNumber min={0} style={{ width:'100%' }} /></Form.Item><Form.Item name="minStock" label="Tồn tối thiểu"><InputNumber min={0} style={{ width:'100%' }} /></Form.Item></div>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  </>;
}
