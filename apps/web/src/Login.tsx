import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { api, setToken } from './api';
import { getErrorMessage } from './errors';
import type { User } from './types';

const developmentInitialValues = import.meta.env.DEV ? { username: 'admin', password: 'admin123456' } : undefined;

type LoginFormValues = {
  username: string;
  password: string;
};

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [form] = Form.useForm<LoginFormValues>();

  async function submit(values: LoginFormValues) {
    try {
      const response = await api.login(values.username, values.password);
      setToken(response.accessToken);
      message.success('Đăng nhập thành công');
      onLogin(response.user);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  }

  return (
    <div className="login-shell">
      <Card className="login-card">
        <div className="login-brand">
          <div className="logo-mark">K</div>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Warehouse CMS
            </Typography.Title>
            <Typography.Text type="secondary">Quản lý nhập xuất tồn và lợi nhuận</Typography.Text>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={submit} initialValues={developmentInitialValues}>
          <Form.Item name="username" label="Tài khoản" rules={[{ required: true, message: 'Nhập tài khoản' }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
