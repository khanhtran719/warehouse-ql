import { Button, Card, Modal, Space, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { exportTypeLabel, money, statusLabel } from '../format';
import { VoucherForm } from './VoucherForm';

export function ExportsPage() {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.products('?pageSize=100') });
  const exportsQ = useQuery({ queryKey: ['exports'], queryFn: api.exports });
  const create = useMutation({ mutationFn: (v:any) => api.createExport({ exportDate: v.date, exportType: v.exportType, note: v.note, items: v.items }), onSuccess: () => { message.success('Đã tạo phiếu xuất'); setOpen(false); qc.invalidateQueries({ queryKey: ['exports'] }); }, onError: (e) => message.error(e.message) });
  const confirm = useMutation({ mutationFn: api.confirmExport, onSuccess: () => { message.success('Đã xác nhận xuất kho'); qc.invalidateQueries(); }, onError: (e) => message.error(e.message) });
  return <><div className="toolbar"><div><h1 className="page-title">Phiếu xuất</h1><div className="page-subtitle">Xác nhận phiếu xuất sẽ trừ tồn, snapshot giá vốn và tính lợi nhuận.</div></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo phiếu xuất</Button></div>
  <Card><Table rowKey="id" loading={exportsQ.isLoading} dataSource={exportsQ.data?.data ?? []} expandable={{ expandedRowRender: (r:any) => <Table rowKey="id" size="small" pagination={false} dataSource={r.items} columns={[{ title: 'Hàng', render:(_: unknown,i:any)=>i.product?.name }, { title:'SL', dataIndex:'quantity' }, { title:'Giá bán', render:(_: unknown,i:any)=>money(i.salePrice) }, { title:'Giá vốn', render:(_: unknown,i:any)=>money(i.costPrice) }, { title:'LN', render:(_: unknown,i:any)=>money(i.profitAmount) }]} /> }} columns={[{ title:'Mã phiếu', dataIndex:'code' }, { title:'Ngày xuất', render:(_: unknown,r:any)=>new Date(r.exportDate).toLocaleDateString('vi-VN') }, { title:'Loại', render:(_: unknown,r:any)=>exportTypeLabel(r.exportType) }, { title:'Trạng thái', render:(_: unknown,r:any)=><Tag>{statusLabel(r.status)}</Tag> }, { title:'Doanh thu', render:(_: unknown,r:any)=>money(r.totalRevenue) }, { title:'Giá vốn', render:(_: unknown,r:any)=>money(r.totalCost) }, { title:'Lợi nhuận', render:(_: unknown,r:any)=>money(r.totalProfit) }, { title:'Thao tác', render:(_: unknown,r:any)=><Space>{r.status === 'DRAFT' && <Button size="small" type="primary" onClick={()=>confirm.mutate(r.id)}>Xác nhận</Button>}</Space> }]} /></Card>
  <Modal width={820} title="Tạo phiếu xuất" open={open} onCancel={()=>setOpen(false)} footer={null}><VoucherForm mode="export" products={products.data?.data ?? []} loading={create.isPending} onSubmit={(v)=>create.mutate(v)} /></Modal></>;
}

