import { KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { api } from '../api';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../errors';
import type { ManagedUser, User } from '../types';

type CreateUserForm = { username: string; name: string; password: string; role: User['role'] };
type ResetPasswordForm = { password: string };

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<ManagedUser['status'] | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [createForm] = Form.useForm<CreateUserForm>();
  const [resetForm] = Form.useForm<ResetPasswordForm>();
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ['users', page, pageSize, status],
    queryFn: () => api.users({ page, pageSize, status }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createUser = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      message.success('Đã tạo tài khoản');
      setCreateOpen(false);
      createForm.resetFields();
      refresh();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateUser>[1] }) => api.updateUser(id, data),
    onSuccess: refresh,
    onError: (error) => message.error(getErrorMessage(error)),
  });
  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.resetUserPassword(id, password),
    onSuccess: () => {
      message.success('Đã đặt lại mật khẩu');
      setResetUser(null);
      resetForm.resetFields();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const columns: TableColumnsType<ManagedUser> = [
    { title: 'Tài khoản', dataIndex: 'username' },
    { title: 'Họ tên', dataIndex: 'name' },
    {
      title: 'Vai trò',
      render: (_, user) => (
        <Select
          value={user.role}
          style={{ width: 140 }}
          onChange={(role) => updateUser.mutate({ id: user.id, data: { role } })}
          options={[
            { value: 'ADMIN', label: 'Quản trị viên' },
            { value: 'STAFF', label: 'Nhân viên' },
          ]}
          aria-label={`Vai trò của ${user.username}`}
        />
      ),
    },
    {
      title: 'Trạng thái',
      render: (_, user) => (
        <Select
          value={user.status}
          style={{ width: 130 }}
          onChange={(nextStatus) => updateUser.mutate({ id: user.id, data: { status: nextStatus } })}
          options={[
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'INACTIVE', label: 'Đã khóa' },
          ]}
          aria-label={`Trạng thái của ${user.username}`}
        />
      ),
    },
    {
      title: 'Nhãn',
      render: (_, user) => <Tag color={user.status === 'ACTIVE' ? 'green' : 'default'}>{user.status}</Tag>,
    },
    {
      title: 'Thao tác',
      render: (_, user) => (
        <Button size="small" icon={<KeyOutlined />} onClick={() => setResetUser(user)}>
          Đặt lại mật khẩu
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tài khoản"
        subtitle="Quản lý quyền truy cập. Tài khoản bị khóa sẽ bị từ chối ngay cả khi token cũ chưa hết hạn."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Thêm tài khoản
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
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'INACTIVE', label: 'Đã khóa' },
          ]}
          style={{ width: 200, marginBottom: 16 }}
          aria-label="Lọc trạng thái tài khoản"
        />
        <Table
          rowKey="id"
          dataSource={users.data?.data ?? []}
          columns={columns}
          loading={users.isLoading || updateUser.isPending}
          scroll={{ x: 850 }}
          pagination={{
            current: page,
            pageSize,
            total: users.data?.pagination.totalItems ?? 0,
            showSizeChanger: true,
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? 20);
          }}
        />
      </Card>

      <Modal
        title="Thêm tài khoản"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        okText="Tạo tài khoản"
        cancelText="Đóng"
        confirmLoading={createUser.isPending}
      >
        <Form form={createForm} layout="vertical" initialValues={{ role: 'STAFF' }} onFinish={createUser.mutate}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, min: 3 }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{ required: true, min: 8 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò">
            <Select
              options={[
                { value: 'STAFF', label: 'Nhân viên' },
                { value: 'ADMIN', label: 'Quản trị viên' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Đặt lại mật khẩu · ${resetUser?.username ?? ''}`}
        open={Boolean(resetUser)}
        onCancel={() => setResetUser(null)}
        onOk={() => resetForm.submit()}
        okText="Đặt lại mật khẩu"
        cancelText="Đóng"
        confirmLoading={resetPassword.isPending}
      >
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={({ password }) => resetUser && resetPassword.mutate({ id: resetUser.id, password })}
        >
          <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true, min: 8 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
