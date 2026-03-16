'use client';

import { Layout, Menu, Avatar } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import './page.css';

const { Header, Sider, Content } = Layout;

export default function Home() {
  const menuItems: MenuProps['items'] = [
    {
      key: 'my-tasks',
      label: '我的任务',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 左侧导航栏 */}
      <Sider
        width={200}
        style={{
          background: '#001529',
        }}
      >
        {/* 应用名字 */}
        <div className="logo">
          <h1>TO-DO-LIST</h1>
        </div>

        {/* 导航菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ display: 'flex', flexDirection: 'column' }}>
        {/* 顶部 Header */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Avatar size={40} style={{ backgroundColor: '#1890ff' }}>
            用户
          </Avatar>
        </Header>

        {/* 中间内容区 */}
        <Content
          style={{
            background: '#f5f5f5',
            padding: '24px',
            flex: 1,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              minHeight: '400px',
            }}
          >
            <h2>欢迎使用待办事项应用</h2>
            <p>这是你的任务列表区域。任务将在这里显示。</p>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
