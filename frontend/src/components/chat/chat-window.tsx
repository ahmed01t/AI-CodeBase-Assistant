"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, User } from "lucide-react";
import { useWorkspace } from "../../context/workspace-context";
import { api } from "../../lib/api-client";
import { streamAgentMessage } from "../../lib/sse-client";
import { Button } from "../ui/button";
import { CodeBlock } from "./code-block";
import { ToolStatusPill } from "./tool-status-pill";
import { CitationPanel } from "./citation-panel";
import type { Message } from "../../types";

export function ChatWindow() {
  const { activeConversationId, activeProject, activeRepo, refreshWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeTool, setActiveTool] = useState<{ tool: string; query?: string; status: "running" | "completed"; totalMatches?: number } | null>(null);
  const [latestCitations, setLatestCitations] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, activeTool]);

  // Load conversation messages when thread changes
  useEffect(() => {
    async function loadMessages() {
      if (!activeConversationId) {
        setMessages([
          {
            id: "welcome-1",
            conversationId: "welcome",
            role: "assistant",
            content: `Hello! I am your **AI Codebase Assistant**.\n\nI search synchronized repository evidence and provide file-and-line citations. Use **Change Impact** to investigate what a code change may affect without creating embeddings.\n\nAsk me anything about the codebase architecture, API routes, or implementation details!`,
            createdAt: new Date().toISOString(),
          },
        ]);
        setLatestCitations([]);
        return;
      }

      try {
        const data = await api.getConversation(activeConversationId);
        if (data && data.messages) {
          setMessages(data.messages);
          const lastAssistant = [...data.messages].reverse().find((m: Message) => m.role === "assistant");
          if (lastAssistant && lastAssistant.sourcesUsed) {
            setLatestCitations(lastAssistant.sourcesUsed);
          }
        }
      } catch (err) {
        console.warn("[Chat] Could not load thread messages:", err);
      }
    }

    loadMessages();
  }, [activeConversationId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isStreaming) return;

    const userQuestion = inputPrompt.trim();
    setInputPrompt("");

    // 1. Append user message to UI
    const tempUserMsg: Message = {
      id: `user-${Date.now()}`,
      conversationId: activeConversationId || "new",
      role: "user",
      content: userQuestion,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setIsStreaming(true);
    setStreamingContent("");
    setActiveTool(null);

    // 2. Ensure we have an active conversation ID
    let currentConvId = activeConversationId;
    if (!currentConvId && activeProject) {
      try {
        const newConv = await api.createConversation(activeProject.id, userQuestion.slice(0, 30));
        currentConvId = newConv.id;
        refreshWorkspace();
      } catch {
        currentConvId = "demo-conv-1";
      }
    }

    // 3. Initiate SSE Streaming
    let accumulatedText = "";
    let capturedSources: any[] = [];

    await streamAgentMessage({
      conversationId: currentConvId || "demo-conv-1",
      content: userQuestion,
      repositoryId: activeRepo?.id,
      onEvent: (event) => {
        if (event.type === "tool_call") {
          setActiveTool({
            tool: event.data.tool,
            query: event.data.query,
            status: "running",
          });
        } else if (event.type === "tool_result") {
          setActiveTool((prev) =>
            prev ? { ...prev, status: "completed", totalMatches: event.data.totalMatches } : null
          );
          if (event.data.sources && event.data.sources.length > 0) {
            capturedSources = event.data.sources;
            setLatestCitations(event.data.sources);
          }
        } else if (event.type === "text_chunk") {
          accumulatedText += event.data.text;
          setStreamingContent(accumulatedText);
        } else if (event.type === "done") {
          if (event.data.sourcesUsed) {
            capturedSources = event.data.sourcesUsed;
            setLatestCitations(event.data.sourcesUsed);
          }
        }
      },
      onComplete: () => {
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            conversationId: currentConvId || "demo-conv-1",
            role: "assistant",
            content: accumulatedText || "Response complete.",
            createdAt: new Date().toISOString(),
            sourcesUsed: capturedSources,
          },
        ]);
        setStreamingContent("");
        setActiveTool(null);
      },
      onError: (err) => {
        console.error("[Chat] Stream error:", err);
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            conversationId: currentConvId || "demo-conv-1",
            role: "assistant",
            content: `I encountered an issue generating the response: ${err.message}. Please verify your API connection or credentials.`,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStreamingContent("");
        setActiveTool(null);
      },
    });
  };

  const renderMessageContent = (content: string) => {
    // Parse markdown code blocks ```lang ... ```
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const firstLineEnd = part.indexOf("\n");
            const language = part.substring(3, firstLineEnd).trim() || "typescript";
            const code = part.substring(firstLineEnd + 1, part.length - 3);
            return <CodeBlock key={index} code={code} language={language} />;
          }

          return (
            <p key={index} className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {part}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-50 dark:bg-[#090d16] transition-colors">
      {/* Central Chat Stream */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 max-w-3xl ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-xs"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-600/10"
                    : "bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-tl-none text-slate-900 dark:text-slate-100 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {msg.role === "user" ? "You" : "CodePilot AI"}
                  </span>
                </div>
                {renderMessageContent(msg.content)}
              </div>
            </div>
          ))}

          {/* Active Live Streaming Section */}
          {isStreaming && (
            <div className="flex gap-3.5 max-w-3xl mr-auto animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-slate-800/80 rounded-tl-none text-slate-900 dark:text-slate-100 shadow-sm flex-1">
                <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">CodePilot AI</span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-300 animate-pulse">● Thinking...</span>
                </div>

                {activeTool && (
                  <ToolStatusPill
                    tool={activeTool.tool}
                    query={activeTool.query}
                    status={activeTool.status}
                    totalMatches={activeTool.totalMatches}
                  />
                )}

                {streamingContent ? (
                  renderMessageContent(streamingContent)
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs py-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-150" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-300" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#07090e] backdrop-blur-md">
          {/* Quick Prompts */}
          <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] shrink-0">Suggestions:</span>
            {[
              "Where is auth middleware located?",
              "How does vector embedding work?",
              "Explain the GitHub Webhooks flow",
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInputPrompt(suggestion)}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0 transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask CodePilot anything about your codebase (e.g. 'How does user login work?')..."
              className="w-full bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 pr-24 shadow-xs transition-all"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <Button
                type="submit"
                size="sm"
                disabled={!inputPrompt.trim() || isStreaming}
                className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 gap-1.5"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Contextual Citations Panel */}
      <CitationPanel sources={latestCitations} />
    </div>
  );
}
