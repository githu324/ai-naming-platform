# 智名 · AI 起名平台

一个基于 **Node.js + Express** 的全栈起名应用：用户填写起名需求（类型、性别、姓氏、风格等），后端调用火山方舟 **Responses API**（`doubao-seed-2-1-pro-260628`）生成 **3 组名字候选**，每组附带整体寓意与逐字解析；历史起名记录存入 **Supabase** 数据库，项目可一键部署到 **Vercel**。

## 功能特性

- 起名类型：宝宝起名 / 店铺品牌 / 网名昵称 / 宠物名字 / 产品项目名
- 可调参数：性别、姓氏、字数偏好、风格偏好、补充要求
- AI 返回严格结构化 JSON：3 组名字 + 拼音 + 寓意 + 逐字解析
- 每次生成自动写入 Supabase `naming_history` 表，前端可查看、展开历史记录
- 无数据库配置时仍可正常生成（仅不保存历史），便于先跑通主流程

## 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | Node.js（ESM）、Express 4 |
| AI | 火山方舟 Responses API，模型 `doubao-seed-2-1-pro-260628` |
| 数据库 | Supabase（PostgreSQL + `@supabase/supabase-js`） |
| 前端 | 原生 HTML / CSS / JavaScript（无需构建） |
| 部署 | Vercel Serverless Function + 静态资源托管 |

## 目录结构

```
ai-naming-platform/
├── package.json            # 依赖与脚本
├── vercel.json             # Vercel 路由：/api/* → Serverless Function
├── .env.example            # 环境变量模板
├── server.js               # 本地 Express 入口
├── api/
│   └── index.js            # Vercel 函数入口（复用 src/app.js）
├── src/
│   ├── app.js              # Express 应用与路由
│   ├── ark.js              # 方舟 Responses API 客户端
│   ├── prompt.js           # 提示词构造 + 返回 JSON 解析校验
│   └── supabase.js         # Supabase 服务端客户端
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── supabase/
    └── schema.sql          # Supabase 建表脚本
```

## 一、环境准备

### 1. 获取火山方舟 API Key

1. 登录 [火山方舟控制台](https://console.volcengine.com/ark)；
2. 开通 `doubao-seed-2-1-pro-260628` 模型服务；
3. 进入「API Key 管理」创建 API Key，复制保存（形如 `xxxx-xxxx`）。

接口调用参考（官方示例）：

```bash
curl https://ark.cn-beijing.volces.com/api/v3/responses \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seed-2-1-pro-260628",
    "input": "hello"
  }'
```

后端在 `input` 之外补充了 `instructions`（系统提示词）与 `text.format=json_object`（结构化输出），响应文本从 `output[].content[].text` 中提取。

### 2. 创建 Supabase 项目并建表

1. 在 [supabase.com](https://supabase.com) 新建项目，等待数据库初始化完成；
2. 进入 **SQL Editor**，粘贴 `supabase/schema.sql` 全文并执行；
3. 进入 **Project Settings → API**，复制两项配置：
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`（仅服务端使用，切勿暴露到浏览器）

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
ARK_API_KEY=你的方舟API Key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-seed-2-1-pro-260628

SUPABASE_URL=https://你的项目ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的service_role_key

PORT=3000
```

## 二、本地运行

```bash
npm install
npm start
# 访问 http://localhost:3000
```

- `npm run dev`：带文件监听的开发模式；
- 若暂时没配 Supabase，页面可正常生成，但历史记录区提示「未配置」；
- 若没配 `ARK_API_KEY`，提交时返回「服务端未配置 ARK_API_KEY」。

## 三、部署到 Vercel

### 1. 代码推送到 GitHub

本仓库已推送至 https://github.com/githu324/ai-naming-platform 。本地迭代后可继续推送：

```bash
git init
git add .
git commit -m "feat: AI 起名平台"
git remote add origin git@github.com:githu324/ai-naming-platform.git
git push -u origin main
```

### 2. Vercel 导入项目

1. 登录 [vercel.com](https://vercel.com)，点击 **Add New → Project**；
2. 选择 `githu324/ai-naming-platform` 仓库，点击 Import；
3. 配置保持默认即可：
   - Framework Preset：**Other**
   - Build Command：留空
   - Output Directory：留空（`public/` 由 Vercel 自动托管）
   - Install Command：`npm install`（通常自动填充）

### 3. 配置环境变量

在项目 **Settings → Environment Variables** 添加（对应 Production / Preview）：

| 变量名 | 说明 |
| --- | --- |
| `ARK_API_KEY` | 方舟 API Key（必填，缺失时生成接口报错但站点可打开） |
| `SUPABASE_URL` | Supabase Project URL（可选，缺失时历史记录不可用） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key（可选） |
| `ARK_BASE_URL` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_MODEL` | 可选，默认 `doubao-seed-2-1-pro-260628` |

> 注意：Vercel 环境变量中不要配置 `PORT`，端口由平台自动注入。

### 4. 部署验证

点击 **Deploy**，等待构建完成后：

1. 打开首页确认表单正常渲染；
2. 配置 `ARK_API_KEY` 并提交一次起名请求，检查是否返回 3 组名字；
3. 访问 `/api/health` 应返回 `{"ok":true,"dbConfigured":...}`；
4. 配置 Supabase 后刷新「历史起名记录」，确认新记录写入 `naming_history` 表。

## 四、接口说明

### `POST /api/generate`

请求体（JSON）：

```json
{
  "category": "baby",
  "gender": "female",
  "surname": "林",
  "nameLength": "3",
  "stylePreference": "文雅诗意",
  "requirements": "出自诗经，寓意平安"
}
```

响应核心字段：`ok`、`dbConfigured`、`names[].name / pinyin / meaning / characters[]`、`record.id`。

### `GET /api/history?limit=15`

返回最近若干条历史记录，含需求摘要与名字数组。

### `GET /api/health`

健康检查：返回服务状态与 `dbConfigured` 布尔值。

## 五、常见问题

**Q：提交后提示「方舟接口调用失败 HTTP 401」**
A：`ARK_API_KEY` 错误、过期或未在方舟控制台开通对应模型，先在本地用官方 curl 示例验证 Key。

**Q：历史记录为空或报数据库错误**
A：检查 Supabase 环境变量是否填对、`schema.sql` 是否已执行；`service_role_key` 不是 `anon_key`。

**Q：Vercel 上访问 `/api/*` 返回 404**
A：确认仓库根目录存在 `vercel.json` 与 `api/index.js`，且环境变量在 Vercel 控制台填写后重新部署。

**Q：想换模型怎么做**
A：修改环境变量 `ARK_MODEL` 为方舟模型列表中的 Model ID 即可，无需改代码。

## 六、安全说明

- `SUPABASE_SERVICE_ROLE_KEY` 与 `ARK_API_KEY` 只存在于服务端（`server.js` / Serverless Function），前端 JS 不读取；
- Supabase 表启用了 RLS，服务端通过 service_role 写入；前端不直连数据库；
- 请勿将 `.env` 提交到 Git（已在 `.gitignore` 中忽略）。
