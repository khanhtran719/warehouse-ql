import { Button, Card, Modal, Space, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api';
import { money, statusLabel } from '../format';
import { VoucherForm } from './VoucherForm';

export function ImportsPage() {
  const [open, setOpen] = useState(false); const qc = useQueryClient();
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.products('?pageSize=100') });
  const imports = useQuery({ queryKey: ['imports'], queryFn: api.imports });
  const create = useMutation({ mutationFn: (v:any) => api.createImport({ importDate: v.date, note: v.note, items: v.items }), onSuccess: () => { message.success('Đã tạo phiếu nhập'); setOpen(false); qc.invalidateQueries({ queryKey: ['imports'] }); } });
  const confirm = useMutation({ mutationFn: api.confirmImport, onSuccess: () => { message.success('Đã xác nhận nhập kho'); qc.invalidateQueries(); }, onError: (e) => message.error(e.message) });
  return <><div className="toolbar"><div><h1 className="page-title">Phiếu nhập</h1><div className="page-subtitle">Xác nhận phiếu nhập sẽ tăng tồn và cập nhật giá vốn bình quân.</div></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Tạo phiếu nhập</Button></div>
  <Card><Table rowKey="id" loading={imports.isLoading} dataSource={imports.data?.data ?? []} expandable={{ expandedRowRender: (r:any) => <Table rowKey="id" size="small" pagination={false} dataSource={r.items} columns={[{ title: 'Hàng', render:(_: unknown,i:any)=>i.product?.name }, { title:'SL', dataIndex:'quantity' }, { title:'Giá', render:(_: unknown,i:any)=>money(i.unitPrice) }, { title:'Thành tiền', render:(_: unknown,i:any)=>money(i.totalAmount) }]} /> }} columns={[{ title:'Mã phiếu', dataIndex:'code' }, { title:'Ngày nhập', render:(_: unknown,r:any)=>new Date(r.importDate).toLocaleDateString('vi-VN') }, { title:'Trạng thái', render:(_: unknown,r:any)=><Tag>{statusLabel(r.status)}</Tag> }, { title:'Tổng tiền', render:(_: unknown,r:any)=>money(r.totalAmount) }, { title:'Thao tác', render:(_: unknown,r:any)=><Space>{r.status === 'DRAFT' && <Button size="small" type="primary" onClick={()=>confirm.mutate(r.id)}>Xác nhận</Button>}</Space> }]} /></Card>
  <Modal width={820} title="Tạo phiếu nhập" open={open} onCancel={()=>setOpen(false)} footer={null}><VoucherForm mode="import" products={products.data?.data ?? []} loading={create.isPending} onSubmit={(v)=>create.mutate(v)} /></Modal></>;
}

