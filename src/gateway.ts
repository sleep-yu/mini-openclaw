import { ChatEvent, Session, Message, ToolCall, ToolResult, ToolDefinition, ChannelAdapter, AIConfig } from "./types.js";
import OpenAI from "openai";

export class Gateway {
  private aiConfig: AIConfig;
  private sessions = new Map<string, Session>();
  private channels: ChannelAdapter[] = []; // 渠道信息
  private tools: ToolDefinition[] = [];
  private channelsByName = new Map<string, ChannelAdapter>()

  constructor(aiConfig: AIConfig) {
    this.aiConfig = aiConfig
  }

  // 注册工具
  registerTools(tools: ToolDefinition[]): void {
    this.tools.push(...tools)
  }

  // 注册渠道
  registerChannel(channel: ChannelAdapter) {
    this.channels.push(channel);
    this.channelsByName.set(channel.name, channel);
    // 渠道收到消息 -> 交给 Gateway 处理
    channel.onMessage((event) => this.handleEvent(event));
  }

  // 处理渠道消息
  private async handleEvent(event: ChatEvent): Promise<void> {
    // 1.获取或创建会话
    let session = this.sessions.get(event.sessionId);
    if (!session) {
      session = this.createSession(event);
      this.sessions.set(event.sessionId, session);
    }
    // 2.把用户消息加入会话历史
    const userMsg: Message = {
      id: event.message.id,
      role: "user",
      content: event.message.content,
      createdAt: event.timestamp
    }
    session.messages.push(userMsg)
    // 3.调用Agent （带工具循环）
    let fullReply = '';
    const channel = this.channelsByName.get(event.channel);
    await this.runAgent(session, async (chunk) => {
      fullReply += chunk;
      if (channel) {
        await channel.send(event.sessionId, chunk); // 立即发送片段
      }
    });
    // 4.保存助手回复到会话
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: fullReply,
      createdAt: new Date()
    }
    session.messages.push(assistantMsg)
  }

  // 创建会话
  private createSession(event: ChatEvent): Session {
    return {
      id: event.sessionId,
      channel: event.channel,
      messages: [],
      tools: [...this.tools], // 复制当前工具列表
      model: this.aiConfig.model,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // 调用 Agent Runtime (核心循环)
  private async runAgent(session: Session, onChunk: (chunk: string) => Promise<void>): Promise<string> {
    // 创建 OpenAI 客户端
    const client = new OpenAI({
      apiKey: this.aiConfig.apiKey,
      baseURL: this.aiConfig.baseUrl,
    })

    // 构建消息历史
    const messages = session.messages.map((msg) => {
      const { role, content } = msg;
      return { role, content }
    })
    // 调用模型
    const stream = await client.chat.completions.create({
      model: this.aiConfig.model,
      messages: messages as any,
      stream: true, // 启动流式
    })
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        await onChunk(content); // 每收到chunk就回调
      }
    }
  }

  // 执行工具调用
  async executeTool(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.find(t => t.name === call.name);
    if (!tool) {
      return {
        id: call.id,
        content: `工具 ${call.name} 不存在`,
        isError: true
      }
    }
    // TODO: 实际执行工具逻辑
    // 这里先返回模拟结果
    return {
      id: call.id,
      content: `[模拟] 执行工具 ${call.name},参数: ${JSON.stringify(call.arguments)}`
    }
  }
}