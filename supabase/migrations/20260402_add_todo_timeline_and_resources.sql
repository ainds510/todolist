alter table public.todos
add column if not exists timeline text,
add column if not exists resources text;

comment on column public.todos.timeline is 'Suggested target timeline or completion window for the task.';
comment on column public.todos.resources is 'Recommended study resources and where/how to get them.';
