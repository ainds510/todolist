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
import {
  CheckCircleOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
type BreakdownResponseItem = {
  title: string;
  priority: TodoPriority;
};

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

const isValidBreakdownResponse = (
  value: unknown
): value is BreakdownResponseItem[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const { title, priority } = item as {
      title?: unknown;
      priority?: unknown;
    };

    return (
      typeof title === 'string' &&
      title.trim().length > 0 &&
      (priority === 'low' || priority === 'medium' || priority === 'high')
    );
  });
};

export default function TodoApp() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isFetchingTodos, setIsFetchingTodos] = useState(false);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [isGeneratingAiTodos, setIsGeneratingAiTodos] = useState(false);
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

  const fetchTodos = useCallback(
    async (currentUserId: string) => {
      setIsFetchingTodos(true);

      const { data, error } = await supabase
        .from('todos')
        .select('id, content, is_completed, priority, user_id, created_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      setIsFetchingTodos(false);

      if (error) {
        notification.error({
          message: t('fetchTodosError'),
          description: error.message,
        });
        return false;
      }

      setTodos(((data ?? []) as TodoRow[]).map(mapTodoRow));
      return true;
    },
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

    const loadTodos = async () => {
      const ok = await fetchTodos(userId);

      if (cancelled || ok) {
        return;
      }
    };

    void loadTodos();

    return () => {
      cancelled = true;
    };
  }, [fetchTodos, isLoaded, userId]);

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

  const addAiBreakdownTasks = async () => {
    const goal = newTask.trim();

    if (!goal || !userId || isGeneratingAiTodos || isAddingTodo) {
      return;
    }

    setIsGeneratingAiTodos(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);
      const breakdownResponse = await (async () => {
        try {
          return await fetch('/api/ai/breakdown', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ goal }),
            signal: controller.signal,
          });
        } finally {
          window.clearTimeout(timeoutId);
        }
      })();

      const breakdownData = (await breakdownResponse.json()) as
        | BreakdownResponseItem[]
        | { error?: string };

      if (!breakdownResponse.ok) {
        notification.error({
          message: 'AI 拆解失败',
          description:
            'error' in breakdownData && breakdownData.error
              ? breakdownData.error
              : '暂时无法完成 AI 拆解，请稍后再试。',
        });
        return;
      }

      if (
        !isValidBreakdownResponse(breakdownData) ||
        breakdownData.length !== 4
      ) {
        notification.error({
          message: 'AI 拆解失败',
          description: 'AI 思考开小差了，请重试',
        });
        return;
      }

      const todosToInsert = breakdownData.map((item) => ({
        content: item.title.trim(),
        priority: item.priority,
        is_completed: false,
        user_id: userId,
      }));

      const { error } = await supabase.from('todos').insert(todosToInsert);

      if (error) {
        notification.error({
          message: t('addTodoError'),
          description: error.message,
        });
        return;
      }

      setNewTask('');
      await fetchTodos(userId);
      message.success('AI 已为你规划完成');
    } catch (error) {
      notification.error({
        message: 'AI 拆解失败',
        description:
          error instanceof Error && error.name === 'AbortError'
            ? '网络繁忙'
            : error instanceof Error
              ? error.message
              : '请求 AI 服务时发生未知错误。',
      });
    } finally {
      setIsGeneratingAiTodos(false);
    }
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
                disabled={isAddingTodo || isGeneratingAiTodos || !isLoaded}
              />
              <Button
                onClick={() => void addAiBreakdownTasks()}
                loading={{ spinning: isGeneratingAiTodos, icon: <LoadingOutlined spin /> }}
                disabled={!isLoaded || isAddingTodo || isGeneratingAiTodos}
              >
                AI 智能拆解
              </Button>
              <Button
                type="primary"
                onClick={() => void addTask()}
                loading={isAddingTodo}
                className="task-add-button"
                disabled={!isLoaded || isGeneratingAiTodos}
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
