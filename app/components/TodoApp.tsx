'use client';

import {
  Layout,
  Menu,
  List,
  Input,
  Button,
  Checkbox,
  Tag,
  Tabs,
  Modal,
  Empty,
  Skeleton,
  message,
  notification,
} from 'antd';
import { CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Header from './Header';
import { useLanguage } from './LanguageProvider';
import { supabase } from '../../lib/supabase';
import '../page.css';

const { Sider, Content } = Layout;

type TodoPriority = 'low' | 'medium' | 'high';

interface TodoRow {
  id: string;
  content: string;
  is_completed: boolean;
  priority: TodoPriority;
  user_id: string;
  created_at: string;
}

interface Todo {
  id: string;
  content: string;
  isCompleted: boolean;
  priority: TodoPriority;
}

type TodoFilter = 'all' | 'active' | 'completed';

const priorityColorMap: Record<TodoPriority, string> = {
  low: 'blue',
  medium: 'gold',
  high: 'red',
};

const loadingSkeletonItems = Array.from({ length: 4 }, (_, index) => index);

const mapTodoRow = (row: TodoRow): Todo => ({
  id: row.id,
  content: row.content,
  isCompleted: row.is_completed,
  priority: row.priority,
});

export default function TodoApp() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isFetchingTodos, setIsFetchingTodos] = useState(false);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [pendingTodoIds, setPendingTodoIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<TodoFilter>('all');

  const priorityLabelMap = useMemo(
    () => ({
      low: t('priorityLow'),
      medium: t('priorityMedium'),
      high: t('priorityHigh'),
    }),
    [t]
  );

  const pendingTodoIdSet = useMemo(() => new Set(pendingTodoIds), [pendingTodoIds]);

  const filteredTodos = useMemo(() => {
    if (activeFilter === 'active') {
      return todos.filter((todo) => !todo.isCompleted);
    }

    if (activeFilter === 'completed') {
      return todos.filter((todo) => todo.isCompleted);
    }

    return todos;
  }, [activeFilter, todos]);

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.isCompleted).length,
    [todos]
  );

  const statsText =
    language === 'zh'
      ? `总共有 ${todos.length} 个任务，已完成 ${completedCount} 个`
      : `${todos.length} tasks in total, ${completedCount} completed`;

  const filterTabs = useMemo(
    () => [
      { key: 'all', label: t('tabAll') },
      { key: 'active', label: t('tabInProgress') },
      { key: 'completed', label: t('tabCompleted') },
    ],
    [t]
  );

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'my-tasks',
        label: t('myTasks'),
        icon: <CheckCircleOutlined />,
      },
    ],
    [t]
  );

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace('/sign-in');
    }
  }, [isLoaded, router, userId]);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    let cancelled = false;

    const fetchTodos = async () => {
      setIsFetchingTodos(true);

      const { data, error } = await supabase
        .from('todos')
        .select('id, content, is_completed, priority, user_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cancelled) {
        return;
      }

      setIsFetchingTodos(false);

      if (error) {
        notification.error({
          message: t('fetchTodosError'),
          description: error.message,
        });
        return;
      }

      setTodos(((data ?? []) as TodoRow[]).map(mapTodoRow));
    };

    void fetchTodos();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, t, userId]);

  const markTodoPending = (id: string, active: boolean) => {
    setPendingTodoIds((currentIds) => {
      if (active) {
        return currentIds.includes(id) ? currentIds : [...currentIds, id];
      }

      return currentIds.filter((currentId) => currentId !== id);
    });
  };

  const addTask = async () => {
    const content = newTask.trim();

    if (!content || !userId || isAddingTodo) {
      return;
    }

    setIsAddingTodo(true);

    const { data, error } = await supabase
      .from('todos')
      .insert({
        content,
        user_id: userId,
        is_completed: false,
        priority: 'medium',
      })
      .select('id, content, is_completed, priority, user_id, created_at')
      .single();

    setIsAddingTodo(false);

    if (error) {
      notification.error({
        message: t('addTodoError'),
        description: error.message,
      });
      return;
    }

    setTodos((currentTodos) => [mapTodoRow(data as TodoRow), ...currentTodos]);
    setNewTask('');
    message.success(t('addTodoSuccess'));
  };

  const toggleTask = async (todo: Todo) => {
    if (!userId || pendingTodoIdSet.has(todo.id)) {
      return;
    }

    markTodoPending(todo.id, true);

    const { data, error } = await supabase
      .from('todos')
      .update({ is_completed: !todo.isCompleted })
      .eq('id', todo.id)
      .eq('user_id', userId)
      .select('id, content, is_completed, priority, user_id, created_at')
      .single();

    markTodoPending(todo.id, false);

    if (error) {
      notification.error({
        message: t('updateTodoError'),
        description: error.message,
      });
      return;
    }

    const updatedTodo = mapTodoRow(data as TodoRow);

    setTodos((currentTodos) =>
      currentTodos.map((currentTodo) =>
        currentTodo.id === todo.id ? updatedTodo : currentTodo
      )
    );
  };

  const deleteTask = (todo: Todo) => {
    Modal.confirm({
      title: t('deleteConfirmTitle'),
      content: t('deleteConfirmContent'),
      okText: t('delete'),
      cancelText: t('cancel'),
      okButtonProps: { danger: true },
      async onOk() {
        if (!userId) {
          return;
        }

        markTodoPending(todo.id, true);

        const { error } = await supabase
          .from('todos')
          .delete()
          .eq('id', todo.id)
          .eq('user_id', userId);

        markTodoPending(todo.id, false);

        if (error) {
          notification.error({
            message: t('deleteTodoError'),
            description: error.message,
          });
          throw error;
        }

        setTodos((currentTodos) =>
          currentTodos.filter((currentTodo) => currentTodo.id !== todo.id)
        );
        message.success(t('deleteTodoSuccess'));
      },
    });
  };

  return (
    <Layout className="app-shell">
      <Sider
        width={200}
        breakpoint="lg"
        collapsedWidth={0}
        className="app-sider"
      >
        <div className="logo">
          <h1>TO-DO-LIST</h1>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout className="main-layout">
        <Header />

        <Content className="content-area">
          <div className="todo-card">
            <h2>{t('myTaskList')}</h2>

            <div className="task-composer">
              <Input
                placeholder={t('newTaskPlaceholder')}
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onPressEnter={() => void addTask()}
                className="task-input"
                disabled={isAddingTodo || !isLoaded}
              />
              <Button
                type="primary"
                onClick={() => void addTask()}
                loading={isAddingTodo}
                className="task-add-button"
                disabled={!isLoaded}
              >
                {t('add')}
              </Button>
            </div>

            <Tabs
              activeKey={activeFilter}
              items={filterTabs}
              onChange={(key) => setActiveFilter(key as TodoFilter)}
              className="task-tabs"
            />

            {!isLoaded || isFetchingTodos ? (
              <div className="task-skeleton-list" aria-live="polite" aria-busy="true">
                {loadingSkeletonItems.map((item) => (
                  <div key={item} className="task-skeleton-item">
                    <Skeleton
                      active
                      avatar={{ shape: 'square', size: 20 }}
                      title={{ width: '45%' }}
                      paragraph={{ rows: 1, width: ['24%'] }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <List
                className="task-list"
                locale={{
                  emptyText: (
                    <Empty
                      description={language === 'zh' ? '暂无任务，快去添加一个吧！' : t('noTasks')}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
                dataSource={filteredTodos}
                renderItem={(todo) => {
                  const isPending = pendingTodoIdSet.has(todo.id);

                  return (
                    <List.Item
                      className="task-list-item"
                      actions={[
                        <Button
                          key="delete"
                          type="text"
                          danger
                          aria-label={t('delete')}
                          icon={<DeleteOutlined />}
                          onClick={() => deleteTask(todo)}
                          loading={isPending}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Checkbox
                            checked={todo.isCompleted}
                            onChange={() => void toggleTask(todo)}
                            disabled={isPending}
                          />
                        }
                        title={
                          <span
                            className={`task-title${todo.isCompleted ? ' task-title-completed' : ''}`}
                          >
                            {todo.content}
                          </span>
                        }
                        description={
                          <Tag color={priorityColorMap[todo.priority]}>
                            {priorityLabelMap[todo.priority]}
                          </Tag>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}

            <div className="task-stats">{statsText}</div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
