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
  timeline: string | null;
  resources: string | null;
}

interface Todo {
  id: string;
  content: string;
  isCompleted: boolean;
  priority: TodoPriority;
  timeline?: string;
  resources?: string;
}

type TodoFilter = 'all' | 'active' | 'completed';
type BreakdownResponseItem = {
  title: string;
  timeline: string;
  resources: string;
  priority: TodoPriority;
};

const AI_TIMELINE_PREFIX = 'Timeline:';
const AI_RESOURCES_PREFIX = 'Resources:';
const TODO_SELECT_BASE =
  'id, content, is_completed, priority, user_id, created_at';
const TODO_SELECT_EXTENDED = `${TODO_SELECT_BASE}, timeline, resources`;

const priorityColorMap: Record<TodoPriority, string> = {
  low: 'blue',
  medium: 'gold',
  high: 'red',
};

const loadingSkeletonItems = Array.from({ length: 4 }, (_, index) => index);

const mapTodoRow = (row: TodoRow): Todo => {
  const [titleLine, ...extraLines] = row.content.split('\n');
  const timelineLine = extraLines.find((line) =>
    line.startsWith(AI_TIMELINE_PREFIX)
  );
  const resourcesLine = extraLines.find((line) =>
    line.startsWith(AI_RESOURCES_PREFIX)
  );

  return {
    id: row.id,
    content: titleLine.trim(),
    isCompleted: row.is_completed,
    priority: row.priority,
    timeline:
      row.timeline?.trim() ||
      timelineLine?.replace(AI_TIMELINE_PREFIX, '').trim(),
    resources:
      row.resources?.trim() ||
      resourcesLine?.replace(AI_RESOURCES_PREFIX, '').trim(),
  };
};

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

    const { title, timeline, resources, priority } = item as {
      title?: unknown;
      timeline?: unknown;
      resources?: unknown;
      priority?: unknown;
    };

    return (
      typeof title === 'string' &&
      title.trim().length > 0 &&
      typeof timeline === 'string' &&
      timeline.trim().length > 0 &&
      typeof resources === 'string' &&
      resources.trim().length > 0 &&
      (priority === 'low' || priority === 'medium' || priority === 'high')
    );
  });
};

const buildAiTodoContent = ({
  title,
  timeline,
  resources,
}: BreakdownResponseItem) =>
  [
    title.trim(),
    `${AI_TIMELINE_PREFIX} ${timeline.trim()}`,
    `${AI_RESOURCES_PREFIX} ${resources.trim()}`,
  ].join('\n');

const isMissingExtendedTodoFieldsError = (error: { message?: string } | null) => {
  const message = error?.message?.toLowerCase() ?? '';

  return (
    message.includes('column') &&
    (message.includes('timeline') || message.includes('resources'))
  );
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
  const [supportsExtendedTodoFields, setSupportsExtendedTodoFields] =
    useState(true);

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

      const runQuery = async (useExtendedFields: boolean) =>
        supabase
          .from('todos')
          .select(useExtendedFields ? TODO_SELECT_EXTENDED : TODO_SELECT_BASE)
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false });

      let { data, error } = await runQuery(supportsExtendedTodoFields);

      if (
        supportsExtendedTodoFields &&
        isMissingExtendedTodoFieldsError(error)
      ) {
        setSupportsExtendedTodoFields(false);
        ({ data, error } = await runQuery(false));
      }

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
    [supportsExtendedTodoFields, t]
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

    const insertBase = {
      content,
      user_id: userId,
      is_completed: false,
      priority: 'medium' as const,
    };

    let result = supportsExtendedTodoFields
      ? await supabase
          .from('todos')
          .insert({
            ...insertBase,
            timeline: null,
            resources: null,
          })
          .select(TODO_SELECT_EXTENDED)
          .single()
      : await supabase
          .from('todos')
          .insert(insertBase)
          .select(TODO_SELECT_BASE)
          .single();

    if (
      supportsExtendedTodoFields &&
      isMissingExtendedTodoFieldsError(result.error)
    ) {
      setSupportsExtendedTodoFields(false);
      result = await supabase
        .from('todos')
        .insert(insertBase)
        .select(TODO_SELECT_BASE)
        .single();
    }

    const { data, error } = result;

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
        content: buildAiTodoContent(item),
        priority: item.priority,
        is_completed: false,
        user_id: userId,
      }));

      let insertError = supportsExtendedTodoFields
        ? (
            await supabase.from('todos').insert(
              breakdownData.map((item) => ({
                ...todosToInsert.find(
                  (todo) =>
                    todo.content === buildAiTodoContent(item) &&
                    todo.priority === item.priority
                )!,
                timeline: item.timeline.trim(),
                resources: item.resources.trim(),
              }))
            )
          ).error
        : (await supabase.from('todos').insert(todosToInsert)).error;

      if (
        supportsExtendedTodoFields &&
        isMissingExtendedTodoFieldsError(insertError)
      ) {
        setSupportsExtendedTodoFields(false);
        insertError = (await supabase.from('todos').insert(todosToInsert)).error;
      }

      if (insertError) {
        notification.error({
          message: t('addTodoError'),
          description: insertError.message,
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

    let result = supportsExtendedTodoFields
      ? await supabase
          .from('todos')
          .update({ is_completed: !todo.isCompleted })
          .eq('id', todo.id)
          .eq('user_id', userId)
          .select(TODO_SELECT_EXTENDED)
          .single()
      : await supabase
          .from('todos')
          .update({ is_completed: !todo.isCompleted })
          .eq('id', todo.id)
          .eq('user_id', userId)
          .select(TODO_SELECT_BASE)
          .single();

    if (
      supportsExtendedTodoFields &&
      isMissingExtendedTodoFieldsError(result.error)
    ) {
      setSupportsExtendedTodoFields(false);
      result = await supabase
        .from('todos')
        .update({ is_completed: !todo.isCompleted })
        .eq('id', todo.id)
        .eq('user_id', userId)
        .select(TODO_SELECT_BASE)
        .single();
    }

    const { data, error } = result;

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
                loading={
                  isGeneratingAiTodos
                    ? { icon: <LoadingOutlined spin /> }
                    : false
                }
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
                          <div className="task-meta">
                            <Tag color={priorityColorMap[todo.priority]}>
                              {priorityLabelMap[todo.priority]}
                            </Tag>
                            {todo.timeline ? (
                              <div className="task-detail">
                                <span className="task-detail-label">
                                  {language === 'zh' ? '目标时间：' : 'Timeline: '}
                                </span>
                                <span>{todo.timeline}</span>
                              </div>
                            ) : null}
                            {todo.resources ? (
                              <div className="task-detail">
                                <span className="task-detail-label">
                                  {language === 'zh' ? '学习资源：' : 'Resources: '}
                                </span>
                                <span>{todo.resources}</span>
                              </div>
                            ) : null}
                          </div>
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
