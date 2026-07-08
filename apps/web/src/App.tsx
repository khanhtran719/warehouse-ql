import {
  BarChartOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  ProductOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { clearToken, getToken } from './api';
import { Login } from './Login';
import { Dashboard } from './pages/Dashboard';
import { ExportPage } from './pages/ExportPage';
import { ExportsPage } from './pages/ExportsPage';
import { ImportsPage } from './pages/ImportsPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';

const { Sider, Content, Header } = Layout;

type PageKey = 'dashboard' | 'products' | 'imports' | 'exports' | 'reports' | 'export';

const menuItems: MenuProps['items'] = [
  { key: 'dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: 'products', icon: <ProductOutlined />, label: 'Hàng hoá' },
  { key: 'imports', icon: <InboxOutlined />, label: 'Phiếu nhập' },
  { key: 'exports', icon: <SendOutlined />, label: 'Phiếu xuất' },
  { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: 'export', icon: <DownloadOutlined />, label: 'Export tháng' },
];

function renderPage(page: PageKey) {
  switch (page) {
    case 'products':
      return <ProductsPage />;
    case 'imports':
      return <ImportsPage />;
    case 'exports':
      return <ExportsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'export':
      return <ExportPage />;
    default:
      return <Dashboard />;
  }
}

export function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [page, setPage] = useState<PageKey>('dashboard');

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  function logout() {
    clearToken();
    setAuthed(false);
  }

  return (
    <Layout className="app-layout">
      <Sider breakpoint="lg" collapsedWidth="0" theme="light">
        <div className="brand-block">
          <div className="logo-mark">K</div>
          <Typography.Text strong>Kho CMS</Typography.Text>
        </div>
        <Menu mode="inline" selectedKeys={[page]} onClick={(event) => setPage(event.key as PageKey)} items={menuItems} />
      </Sider>

      <Layout>
        <Header className="app-header">
          <Typography.Text type="secondary">
            <DatabaseOutlined /> Một kho - giá vốn bình quân
          </Typography.Text>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            Đăng xuất
          </Button>
        </Header>
        <Content className="app-content">{renderPage(page)}</Content>
      </Layout>
    </Layout>
  );
}
