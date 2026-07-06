import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { api, setToken } from './api';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [form] = Form.useForm();
  async function submit(values: { username: string; password: string }) {
    try { const res = await api.login(values.username, values.password); setToken(res.accessToken); message.success('Đăng nhập thành công'); onLogin(); }
    catch (e) { message.error('Không thể đăng nhập. Kiểm tra tài khoản/mật khẩu.'); }
  }
  return <div className="login-shell"><Card className="login-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><div className="logo-mark">K</div><div><Typography.Title level={3} style={{ margin: 0 }}>Warehouse CMS</Typography.Title><Typography.Text type="secondary">Quản lý nhập xuất tồn và lợi nhuận</Typography.Text></div></div>
    <Form form={form} layout="vertical" onFinish={submit} initialValues={{ username: 'admin', password: 'admin123456' }}>
      <Form.Item name="username" label="Tài khoản" rules={[{ required: true }]}><Input prefix={<UserOutlined />} autoComplete="username" /></Form.Item>
      <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}><Input.Password prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item>
      <Button type="primary" htmlType="submit" block size="large">Đăng nhập</Button>
    </Form>
  </Card></div>;
}
