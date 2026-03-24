'use client';

import { Layout, Menu, List, Input, Button, Checkbox, Tag, Modal, message } from 'antd';
import { CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import './page.css';

const { Sider, Content } = Layout;

// 定义任务接口
interface Task {
  id: number;
  description: string;
  completed: boolean;
  priority: '紧急' | '普通';
}

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 未登录时重定向到登录页面
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setIsRedirecting(true);
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const menuItems: MenuProps['items'] = [
    {
      key: 'my-tasks',
      label: '我的任务',
      icon: <CheckCircleOutlined />,
    },
  ];

  // 模拟任务数据
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      description: '完成项目报告',
      completed: false,
      priority: '紧急',
    },
    {
      id: 2,
      description: '购买生活用品',
      completed: true,
      priority: '普通',
    },
    {
      id: 3,
      description: '学习 TypeScript',
      completed: false,
      priority: '普通',
    },
  ]);

  const [newTask, setNewTask] = useState('');

  // 切换任务完成状态
  const toggleTask = (id: number) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  // 删除任务
  const deleteTask = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      onOk() {
        setTasks(tasks.filter(task => task.id !== id));
        message.success('删除成功');
      },
    });
  };

  // 添加新任务
  const addTask = () => {
    if (newTask.trim()) {
      const newId = Date.now();
      setTasks([{
        id: newId,
        description: newTask,
        completed: false,
        priority: '普通',
      }, ...tasks]);
      setNewTask('');
    }
  };

  // 未登录时显示重定向提示
  if (isRedirecting || !isLoaded || !isSignedIn) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header />
        <Layout style={{ display: 'flex', flexDirection: 'column' }}>
          <Content
            style={{
              background: '#f5f5f5',
              padding: '24px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h2>正在重定向至登录页面...</h2>
            </div>
          </Content>
        </Layout>
      </Layout>
    );
  }

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
        <Header />

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
            <h2>我的任务列表</h2>

            {/* 添加新任务区域 */}
            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
              <Input
                placeholder="想做点什么？"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onPressEnter={addTask}
                style={{ flex: 1 }}
              />
              <Button type="primary" onClick={addTask}>
                添加
              </Button>
            </div>

            {/* 任务列表 */}
            <List
              dataSource={tasks}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <DeleteOutlined
                      key="delete"
                      style={{ color: 'red', cursor: 'pointer' }}
                      onClick={() => deleteTask(task.id)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Checkbox
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                      />
                    }
                    title={
                      <span style={{
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? '#999' : '#000'
                      }}>
                        {task.description}
                      </span>
                    }
                    description={
                      <Tag color={task.priority === '紧急' ? 'red' : 'blue'}>
                        {task.priority}
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
