// 起名需求归一化、提示词构造、AI 返回 JSON 的解析与校验

export const CATEGORY_LABELS = {
  baby: '宝宝起名',
  brand: '店铺 / 品牌起名',
  nickname: '网名 / 昵称',
  pet: '宠物名字',
  product: '产品 / 项目名',
};

const GENDER_LABELS = {
  male: '男',
  female: '女',
  '': '不限',
};

const LENGTH_LABELS = {
  '2': '2 个字',
  '3': '3 个字',
  '': '不限',
};

export function normalizeRequirements(body = {}) {
  const str = (v, max = 300) =>
    typeof v === 'string' ? v.trim().slice(0, max) : '';
  return {
    category: Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, body.category)
      ? body.category
      : 'baby',
    gender: ['male', 'female', ''].includes(body.gender) ? body.gender : '',
    surname: str(body.surname, 20),
    nameLength: ['2', '3', ''].includes(body.nameLength) ? body.nameLength : '',
    stylePreference: str(body.stylePreference, 200),
    requirements: str(body.requirements, 500),
  };
}

export function buildNamingPrompt(req) {
  const instructions = [
    '你是一位精通中文姓名学、经典诗词典故与品牌命名的专业起名顾问。',
    '任务：根据用户给出的起名需求，给出恰好 3 组候选名字。',
    '硬性要求：',
    '1. 读音顺口、避免不良谐音、避免过于生僻或歧义的字；',
    '2. 寓意解释要结合字义、典故出处或气质风格，言之有物，不空泛；',
    '3. 若用户填写了姓氏：宝宝名需把姓氏与名字组合为完整姓名；其他类型名字单独给出；',
    '4. 严格只输出一个 JSON 对象，不要输出任何解释性文字、不要使用 markdown 代码块；',
    '5. JSON 结构固定为：',
    '{',
    '  "names": [',
    '    {',
    '      "name": "完整名字",',
    '      "pinyin": "拼音，以空格分隔",',
    '      "meaning": "整体寓意，2-4 句",',
    '      "characters": [ { "char": "单个汉字", "explanation": "该字的含义与取名用意" } ]',
    '    }',
    '  ]',
    '}',
    '其中 characters 数组长度等于名字字数；其他类型（品牌/网名等）可省略逐字解析，保留空数组。',
  ].join('\n');

  const userContent = [
    '【起名需求】',
    `- 类型：${CATEGORY_LABELS[req.category]}`,
    `- 性别：${GENDER_LABELS[req.gender]}`,
    req.surname ? `- 姓氏：${req.surname}` : '- 姓氏：无',
    `- 字数偏好：${LENGTH_LABELS[req.nameLength]}`,
    req.stylePreference ? `- 风格偏好：${req.stylePreference}` : '- 风格偏好：无特殊要求',
    req.requirements ? `- 补充要求：${req.requirements}` : '- 补充要求：无',
    '',
    '请按上述 JSON 格式输出恰好 3 组名字。',
  ].join('\n');

  return { instructions, userInput: userContent };
}

/**
 * 从模型输出文本中提取并校验名字数组
 * @param {string} text
 * @returns {Array<{order:number,name:string,pinyin:string,meaning:string,characters:Array<{char:string,explanation:string}>}>}
 */
export function parseNamesPayload(text) {
  let raw = (text || '').trim();
  if (!raw) throw new Error('AI 返回内容为空');

  // 去掉可能出现的 ```json ... ``` 代码块围栏
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI 返回内容无法解析为 JSON 对象');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    throw new Error(`AI 返回 JSON 格式错误：${err.message}`);
  }

  const list = Array.isArray(parsed.names) ? parsed.names : [];
  const names = list.slice(0, 3).map(normalizeName);
  if (!names.length) throw new Error('AI 未返回有效的名字候选');
  return names;
}

function normalizeName(item = {}, order) {
  const characters = Array.isArray(item.characters)
    ? item.characters
        .slice(0, 8)
        .map((c) => ({
          char: String(c?.char ?? '').trim(),
          explanation: String(c?.explanation ?? '').trim(),
        }))
        .filter((c) => c.char)
    : [];
  return {
    order: order + 1,
    name: String(item.name ?? '').trim(),
    pinyin: String(item.pinyin ?? '').trim(),
    meaning: String(item.meaning ?? '').trim(),
    characters,
  };
}
