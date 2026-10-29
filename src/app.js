import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateNamesFromRequirements } from './ark.js';
import { normalizeRequirements, parseNamesPayload, CATEGORY_LABELS } from './prompt.js';
import { getSupabase, dbConfigured } from './supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(publicDir));

// ---------- 健康检查 ----------
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ai-naming-platform',
    dbConfigured: dbConfigured(),
    time: new Date().toISOString(),
  });
});

// ---------- 生成 3 组名字 ----------
app.post('/api/generate', async (req, res) => {
  try {
    const requirements = normalizeRequirements(req.body);

    const ai = await generateNamesFromRequirements(requirements);
    const names = parseNamesPayload(ai.text);

    let record = null;
    if (dbConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('naming_history')
        .insert({
          category: requirements.category,
          gender: requirements.gender || null,
          surname: requirements.surname || null,
          name_length: requirements.nameLength || null,
          style_preference: requirements.stylePreference || null,
          requirements: requirements.requirements || null,
          names,
          model: ai.model,
        })
        .select('id, created_at')
        .single();
      if (error) {
        // 数据库失败不阻断主流程，仅记录日志
        console.error('[supabase insert]', error.message);
      } else {
        record = data;
      }
    }

    res.json({
      ok: true,
      dbConfigured: dbConfigured(),
      requirements,
      names,
      record,
    });
  } catch (err) {
    console.error('[generate]', err);
    res.status(500).json({
      ok: false,
      error: err.message || '生成失败，请稍后重试',
    });
  }
});

// ---------- 历史记录 ----------
app.get('/api/history', async (req, res) => {
  try {
    if (!dbConfigured()) {
      return res.json({ ok: true, dbConfigured: false, records: [] });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('naming_history')
      .select(
        'id, created_at, category, gender, surname, name_length, style_preference, requirements, names'
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    res.json({
      ok: true,
      dbConfigured: true,
      records: (data || []).map((r) => ({ ...r, categoryLabel: CATEGORY_LABELS[r.category] || r.category })),
    });
  } catch (err) {
    console.error('[history]', err);
    res.status(500).json({ ok: false, error: err.message || '历史记录查询失败' });
  }
});

// ---------- 兜底：未知 API 返回 404，其余回落到首页 ----------
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: '接口不存在' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

export default app;
