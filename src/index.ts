import { Gateway } from "./gateway.js";
import { WebChatChannel } from "./channels/webchat.js";
import type { AIConfig } from "./types.js";

async function main() {
  // 配置AI
  const aiConfig: AIConfig = {
    provider: 'openai',
    model: process.env.OPENCLAW_MODEL || '',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENCLAW_BASE_URL || '',
  }

  // 创建 Gateway
  const gateway = new Gateway(aiConfig);
  const webchat = new WebChatChannel();

  // 注册渠道
  gateway.registerChannel(webchat);

  // 启动渠道
  await webchat.start();

  console.log("🦞 MiniOpenClaw 启动成功");
  console.log(`WebChat: http://127.0.0.1:18788`);
}

main().catch(console.error);








