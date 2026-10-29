import { createClient } from '@supabase/supabase-js';

let client = null;

/**
 * Supabase 客户端（服务端单例）
 * 使用 SERVICE_ROLE_KEY 访问，绕过 RLS；严禁把该密钥下发到浏览器端。
 */
export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function dbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
