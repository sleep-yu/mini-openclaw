/** 消息类型 */
export type MessageType = "text" | "image" | "audio" | "file";

/** 单条消息 */
export interface Message {
  id: string
  role: "user" | "assistant" | "tool"
  content: string
  name?: string       // tool 时表示工具名
  toolCallId?: string // tool 时表示调用 ID
  createdAt: Date
}

/** 聊天事件（所有渠道统一格式）*/
export interface ChatEvent {
  channel: string     // "webchat" | "telegram" | "feishu"
  sessionId: string
  sender: {
    id: string
    name: string
  }
  message: {
    id: string
    type: MessageType
    content: string
  }
  timestamp: Date
}

/** 工具参数定义 */
export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object"
  description?: string
  enum?: string[]
}

/** 工具定义 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, ToolParameter>
    required?: string[]
  }
}

/** 工具调用 */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** 工具执行结果 */
export interface ToolResult {
  id: string
  content: string
  isError?: boolean
}

/** 会话状态 */
export interface Session {
  id: string
  channel: string
  messages: Message[]
  tools: ToolDefinition[]
  model: string
  createdAt: Date
  updatedAt: Date
}

export type AIProvider = "openai" | "anthropic" | "ollama"

/** AI 配置 */
export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
  baseUrl?: string   // ollama 用
}

/** 渠道适配器接口 */
export interface ChannelAdapter {
  name: string
  start(): Promise<void>
  stop(): Promise<void>
  send(sessionId: string, content: string): Promise<void>;
  onMessage(handler: (event: ChatEvent) => void): void
}