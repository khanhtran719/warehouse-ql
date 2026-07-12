import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useDeferredValue, useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import type { Partner, PartnerInput } from '../types';

type PartnerKind = 'customer' | 'supplier';

function PartnerTable({ kind, canManage }: { kind: PartnerKind; canManage: boolean }) {
  const label = kind === 'customer' ? 'khách hàng' : 'nhà cung cấp';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<Partner['status'] | undefined>();
  const [editing, setEditing] = useState<Partner | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PartnerInput>();
  const queryClient = useQueryClient();

  const partners = useQuery({
    queryKey: [kind === 'customer' ? 'customers' : 'suppliers', page, pageSize, deferredSearch, status],
    queryFn: () =>
      kind === 'customer'
        ? api.customers({ page, pageSize, search: deferredSearch, status })
        : api.suppliers({ page, pageSize, search: deferredSearch, status }),
  });

  const save = useMutation({
    mutationFn: (values: PartnerInput) => {
      if (kind === 'customer') {
        return editing ? api.updateCustomer(editing.id, values) : api.createCustomer(values);
      }
      return editing ? api.updateSupplier(editing.id, values) : api.createSupplier(values);
    },
    onSuccess: () => {
      message.success(`Đã lưu ${label}`);
      setOpen(false);
      setEditing(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: [kind === 'customer' ? 'customers' : 'suppliers'] });
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<Partner> = [
    { title: 'Mã', dataIndex: 'code', width: 120 },
    { title: 'Tên', dataIndex: 'name', width: 220 },
    { title: 'Điện thoại', dataIndex: 'phone', render: (value) => value || '-' },
    { title: 'Mã số thuế', dataIndex: 'taxCode', render: (value) => value || '-' },
    { title: 'Địa chỉ', dataIndex: 'address', render: (value) => value || '-' },
    {
      title: 'Trạng thái',
      render: (_, partner) => (
        <Tag color={partner.status === 'ACTIVE' ? 'green' : 'default'}>
          {partner.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
        </Tag>
      ),
    },
    ...(canManage
      ? [
          {
            title: 'Thao tác',
            render: (_: unknown, partner: Partner) => (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditing(partner);
                  form.setFieldsValue({
                    code: partner.code,
                    name: partner.name,
                    phone: partner.phone ?? undefined,
                    email: partner.email ?? undefined,
                    address: partner.address ?? undefined,
                    taxCode: partner.taxCode ?? undefined,
                    contactPerson: partner.contactPerson ?? undefined,
                    note: partner.note ?? undefined,
                    status: partner.status,
                  });
                  setOpen(true);
                }}
              >
                Sửa
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card>
      <div className="toolbar">
        <Space wrap>
          <Input.Search
            allowClear
            value={search}
            placeholder={`Tìm mã, tên, SĐT ${label}`}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            style={{ width: 300 }}
          />
          <Select
            allowClear
            value={status}
            placeholder="Lọc trạng thái"
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'INACTIVE', label: 'Ngừng hoạt động' },
            ]}
            style={{ width: 180 }}
          />
        </Space>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldValue('status', 'ACTIVE');
              setOpen(true);
            }}
          >
            Thêm {label}
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        loading={partners.isLoading}
        dataSource={partners.data?.data ?? []}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total: partners.data?.pagination.totalItems ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `${total} ${label}`,
        }}
        onChange={(pagination) => {
          setPage(pagination.current ?? 1);
          setPageSize(pagination.pageSize ?? 20);
        }}
      />

      <Modal
        title={`${editing ? 'Sửa' : 'Thêm'} ${label}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        okText="Lưu"
        cancelText="Đóng"
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
          <div className="form-grid">
            <Form.Item name="code" label="Mã" rules={[{ required: true, message: 'Nhập mã' }]}>
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="phone" label="Điện thoại">
              <Input maxLength={30} />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
              <Input maxLength={200} />
            </Form.Item>
            <Form.Item name="taxCode" label="Mã số thuế">
              <Input maxLength={30} />
            </Form.Item>
            <Form.Item name="contactPerson" label="Người liên hệ">
              <Input maxLength={200} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Địa chỉ">
            <Input maxLength={500} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} maxLength={1000} showCount />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select
              options={[
                { value: 'ACTIVE', label: 'Hoạt động' },
                { value: 'INACTIVE', label: 'Ngừng hoạt động' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export function PartnersPage({ canManage }: { canManage: boolean }) {
  return (
    <>
      <PageHeader
        title="Khách hàng & nhà cung cấp"
        subtitle="Quản lý thông tin giao dịch và chọn nhanh khi lập phiếu nhập, phiếu xuất."
      />
      <Tabs
        items={[
          { key: 'customers', label: 'Khách hàng', children: <PartnerTable kind="customer" canManage={canManage} /> },
          { key: 'suppliers', label: 'Nhà cung cấp', children: <PartnerTable kind="supplier" canManage={canManage} /> },
        ]}
      />
    </>
  );
}
