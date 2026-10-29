import 'dotenv/config';
import app from './src/app.js';

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`[ai-naming] 本地服务已启动: http://localhost:${port}`);
  if (!process.env.ARK_API_KEY) {
    console.warn('[ai-naming] 警告: 未配置 ARK_API_KEY，AI 生成接口将不可用');
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[ai-naming] 提示: 未配置 Supabase 环境变量，历史记录将不可用（不影响生成）');
  }
});
