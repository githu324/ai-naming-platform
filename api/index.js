// Vercel Serverless Function 入口：复用同一份 Express 应用
// vercel.json 将 /api/* 的请求全部转发到本文件
import app from '../src/app.js';

export default app;
