import { WebSocketServer, WebSocket } from "ws";
import type { ChatEvent, ChannelAdapter } from "../types.js";

export class WebChatChannel implements ChannelAdapter {
  name = 'webchat';
  private wss: WebSocketServer | null = null;
  private sessions = new Map<string, WebSocket>();
  private eventHandlers: ((event: ChatEvent) => void)[] = [];
  private port = 18789  // 默认值，可配置

  // 启动websocket服务器
  async start(): Promise<void> {
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on('connection', (ws) => {
      // 生成唯一id
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, ws);
      // 监听到消息进入
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message') {
            const event: ChatEvent = {
              channel: 'webchat',
              sessionId,
              sender: { id: sessionId, name: 'anonymous' },
              message: { id: crypto.randomUUID(), type: 'text', content: msg.content },
              timestamp: new Date()
            }
            // 派发给所有注册的事件处理器
            this.eventHandlers.forEach((h) => h(event));
          }
        } catch (error) {
          console.error("WebSocket message parse error:", error)
        }
      })

      ws.on("error", (err) => {
        console.error("[WebChat] WebSocket error:", err)
      })

      // 监听到关闭会话
      ws.on("close", () => {
        this.sessions.delete(sessionId)
      })
    })

    this.wss.on("error", (err) => {
      console.error("[WebChat] server error:", err)
    })

    console.log(`[WebChat] WebSocket server running on ws://127.0.0.1:${this.port}`)
  }

  async stop(): Promise<void> {
    this.wss?.close();
    this.wss = null;
    this.sessions.clear();
  }

  // 发送消息到客户端
  async send(sessionId: string, content: string): Promise<void> {
    const ws = this.sessions.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      type: 'message',
      content,
      sessionId,
    })
    ws.send(payload);
  }

  // 注册事件处理器(gateway会调用)
  onMessage(handlers: (event: ChatEvent) => void) {
    this.eventHandlers.push(handlers);
  }
}