import { BarChartOutlined, DatabaseOutlined, DownloadOutlined, HomeOutlined, InboxOutlined, LogoutOutlined, ProductOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';
import { useState } from 'react';
import { clearToken, getToken } from './api';
import { Login } from './Login';
import { Dashboard } from './pages/Dashboard';
import { ProductsPage } from './pages/ProductsPage';
import { ImportsPage } from './pages/ImportsPage';
import { ExportsPage } from './pages/ExportsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExportPage } from './pages/ExportPage';

const { Sider, Content, Header } = Layout;
type PageKey = 'dashboard' | 'products' | 'imports' | 'exports' | 'reports' | 'export';

export function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [page, setPage] = useState<PageKey>('dashboard');
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  const content = { dashboard: <Dashboard />, products: <ProductsPage />, imports: <ImportsPage />, exports: <ExportsPage />, reports: <ReportsPage />, export: <ExportPage /> }[page];
  return <Layout className="app-layout">
    <Sider breakpoint="lg" collapsedWidth="0" theme="light">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16 }}><div className="logo-mark">K</div><Typography.Text strong>Kho CMS</Typography.Text></div>
      <Menu mode="inline" selectedKeys={[page]} onClick={(e) => setPage(e.key as PageKey)} items={[
        { key: 'dashboard', icon: <HomeOutlined />, label: 'Dashboard' }, { key: 'products', icon: <ProductOutlined />, label: 'Hàng hoá' },
        { key: 'imports', icon: <InboxOutlined />, label: 'Phiếu nhập' }, { key: 'exports', icon: <SendOutlined />, label: 'Phiếu xuất' },
        { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' }, { key: 'export', icon: <DownloadOutlined />, label: 'Export tháng' },
      ]} />
    </Sider>
    <Layout><Header className="app-header"><div><Typography.Text type="secondary"><DatabaseOutlined /> Một kho - giá vốn bình quân</Typography.Text></div><Button icon={<LogoutOutlined />} onClick={() => { clearToken(); setAuthed(false); }}>Đăng xuất</Button></Header><Content className="app-content">{content}</Content></Layout>
  </Layout>;
}
