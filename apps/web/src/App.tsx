import {
  BarChartOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  ProductOutlined,
  SendOutlined,
  TeamOutlined,
  ContactsOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Spin, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { lazy, Suspense, useEffect, useState } from 'react';
import { api, AUTH_UNAUTHORIZED_EVENT, clearToken, getToken } from './api';
import { Login } from './Login';
import type { User } from './types';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const ExportPage = lazy(() => import('./pages/ExportPage').then((module) => ({ default: module.ExportPage })));
const ExportsPage = lazy(() => import('./pages/ExportsPage').then((module) => ({ default: module.ExportsPage })));
const ImportsPage = lazy(() => import('./pages/ImportsPage').then((module) => ({ default: module.ImportsPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })));
const PartnersPage = lazy(() => import('./pages/PartnersPage').then((module) => ({ default: module.PartnersPage })));

const { Sider, Content, Header } = Layout;

type PageKey = 'dashboard' | 'products' | 'partners' | 'imports' | 'exports' | 'reports' | 'export' | 'users';

const menuItems: NonNullable<MenuProps['items']> = [
  { key: 'dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: 'products', icon: <ProductOutlined />, label: 'Hàng hoá' },
  { key: 'partners', icon: <ContactsOutlined />, label: 'Đối tác' },
  { key: 'imports', icon: <InboxOutlined />, label: 'Phiếu nhập' },
  { key: 'exports', icon: <SendOutlined />, label: 'Phiếu xuất' },
  { key: 'reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
  { key: 'export', icon: <DownloadOutlined />, label: 'Export tháng' },
];

function renderPage(page: PageKey, canManage: boolean) {
  switch (page) {
    case 'products':
      return <ProductsPage canManage={canManage} />;
    case 'imports':
      return <ImportsPage />;
    case 'partners':
      return <PartnersPage canManage={canManage} />;
    case 'exports':
      return <ExportsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'export':
      return <ExportPage />;
    case 'users':
      return canManage ? <UsersPage /> : <Dashboard />;
    default:
      return <Dashboard />;
  }
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));
  const [page, setPage] = useState<PageKey>('dashboard');

  useEffect(() => {
    let active = true;
    const onUnauthorized = () => {
      if (active) {
        setUser(null);
        setCheckingSession(false);
      }
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);

    if (getToken()) {
      api
        .me()
        .then((currentUser) => active && setUser(currentUser))
        .catch(() => active && setUser(null))
        .finally(() => active && setCheckingSession(false));
    }

    return () => {
      active = false;
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="session-loading" role="status" aria-label="Đang kiểm tra phiên đăng nhập">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;

  const visibleMenuItems: MenuProps['items'] =
    user.role === 'ADMIN' ? [...menuItems, { key: 'users', icon: <TeamOutlined />, label: 'Tài khoản' }] : menuItems;

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <Layout className="app-layout">
      <Sider breakpoint="lg" collapsedWidth="0" theme="light">
        <div className="brand-block">
          <div className="logo-mark">K</div>
          <Typography.Text strong>Kho CMS</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[page]}
          onClick={(event) => setPage(event.key as PageKey)}
          items={visibleMenuItems}
        />
      </Sider>

      <Layout>
        <Header className="app-header">
          <Typography.Text type="secondary">
            <DatabaseOutlined /> {user.name} · {user.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
          </Typography.Text>
          <Button icon={<LogoutOutlined />} onClick={logout}>
            Đăng xuất
          </Button>
        </Header>
        <Content className="app-content">
          <Suspense fallback={<Spin aria-label="Đang tải trang" />}>{renderPage(page, user.role === 'ADMIN')}</Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
