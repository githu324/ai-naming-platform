// 火山方舟 Responses API 客户端
// 官方示例：
// curl https://ark.cn-beijing.volces.com/api/v3/responses \
//   -H "Authorization: Bearer $ARK_API_KEY" \
//   -H "Content-Type: application/json" \
//   -d '{"model": "doubao-seed-2-1-pro-260628", "input": "hello"}'

import { buildNamingPrompt } from './prompt.js';

export const DEFAULT_MODEL = 'doubao-seed-2-1-pro-260628';
export const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

/**
 * 调用 Responses API
 * @param {{instructions:string, input:Array<{role:string,content:string}>}} payload
 */
export async function callArkResponses({ instructions, input }) {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error('服务端未配置 ARK_API_KEY 环境变量');

  const baseUrl = (process.env.ARK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.ARK_MODEL || DEFAULT_MODEL;

  const body = {
    model,
    instructions,
    input,
    // 结构化输出（Responses API 的 text.format）
    text: { format: { type: 'json_object' } },
    // 关闭深度思考以降低起名场景的延迟
    thinking: { type: 'disabled' },
    max_output_tokens: 2000,
  };

  const resp = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`方舟接口调用失败 HTTP ${resp.status}：${errText.slice(0, 500)}`);
  }
  return resp.json();
}

/**
 * 从 Responses 返回对象中提取助手最终文本
 * 结构：output[] → type=message → content[] → type=output_text → text
 */
export function extractAssistantText(data) {
  if (!data || !Array.isArray(data.output)) return '';
  return data.output
    .filter((item) => item && item.type === 'message')
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((c) => c && c.type === 'output_text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n')
    .trim();
}

/**
 * 按起名需求调用模型，返回原始文本与模型名
 */
export async function generateNamesFromRequirements(requirements) {
  const { instructions, userInput } = buildNamingPrompt(requirements);
  const data = await callArkResponses({
    instructions,
    input: [{ role: 'user', content: userInput }],
  });
  return {
    text: extractAssistantText(data),
    model: data.model || process.env.ARK_MODEL || DEFAULT_MODEL,
    responseId: data.id || null,
  };
}
