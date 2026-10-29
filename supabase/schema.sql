-- ============================================================
-- AI 起名平台 · Supabase 数据库初始化脚本
-- 使用方式：Supabase 控制台 → SQL Editor → 粘贴执行 → Run
-- 表名：naming_history（起名历史记录）
-- ============================================================

create table if not exists naming_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- 用户需求
  category text not null default 'baby',        -- baby / brand / nickname / pet / product
  gender text,                                   -- male / female / null
  surname text,                                  -- 姓氏（可选）
  name_length text,                              -- '2' / '3' / null
  style_preference text,                         -- 风格偏好
  requirements text,                             -- 补充要求原文

  -- AI 返回结果（3 组名字）
  names jsonb not null,

  -- 使用的模型
  model text not null
);

-- 按时间倒序查询历史
create index if not exists naming_history_created_at_idx
  on naming_history (created_at desc);

-- 启用 RLS：服务端使用 SERVICE_ROLE_KEY 绕过策略读写；
-- 浏览器端不持有 service_role key，因此不开放任何匿名策略。
alter table naming_history enable row level security;

-- 如后续需要匿名用户直接读取自己的记录，可在此补充 policy；
-- 当前架构下无需额外 policy。
