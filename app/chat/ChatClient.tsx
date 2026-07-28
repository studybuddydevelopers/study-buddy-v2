// app/chat/ChatClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Pencil, Plus, Trash2 } from "lucide-react";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import ChatMessageContainer, {
  type ChatMessageData,
} from "@/components/ChatMessageContainer";

const AI_AVATAR = "https://i.pravatar.cc/40?img=32";
const DEFAULT_USER_AVATAR =
  "https://img.icons8.com/?size=100&id=HEBTcR9O3uzR&format=png&color=000000";
const CHAT_PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 50;

interface MeResponse {
  profile: {
    avatarUrl?: string | null;
  } | null;
}

interface SubjectOption {
  id: string;
  name: string;
  displayName?: string;
  topics: TopicOption[];
}

interface TopicOption {
  id: string;
  title: string;
}

interface MaterialsOverviewResponse {
  subjects: SubjectOption[];
}

interface ApiChat {
  id: string;
  title: string;
  subjectId: string | null;
  topicId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isStarted: boolean;
  subject?: { id: string; name: string; examCode: string | null } | null;
  topic?: { id: string; title: string; subjectId: string } | null;
}

interface ApiMessage {
  id: string;
  chatId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
  requestId: string | null;
}

interface GenerationResponse {
  chat: ApiChat;
  userMessage: ApiMessage;
  assistantMessage: ApiMessage;
  error?: { code: string; status: number };
}

function sortApiMessages(messages: ApiMessage[]) {
  return [...messages].sort((a, b) => {
    const dateDelta =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (dateDelta !== 0) return dateDelta;
    return a.id.localeCompare(b.id);
  });
}

function sortChatMessages(messages: ChatMessageData[]) {
  return [...messages].sort((a, b) => {
    const aCreatedAt = a.createdAt ?? "";
    const bCreatedAt = b.createdAt ?? "";
    if (aCreatedAt !== bCreatedAt) {
      return aCreatedAt.localeCompare(bCreatedAt);
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

function sortChats(chats: ApiChat[]) {
  return [...chats].sort((a, b) => {
    const dateDelta =
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (dateDelta !== 0) return dateDelta;
    return b.id.localeCompare(a.id);
  });
}

function toChatMessageData(
  message: ApiMessage,
  userAvatar?: string | null
): ChatMessageData {
  const isUser = message.role === "USER";
  return {
    id: message.id,
    sender: isUser ? "user" : "ai",
    name: isUser ? "You" : "AI Tutor",
    text: message.content,
    avatar: isUser ? userAvatar ?? DEFAULT_USER_AVATAR : AI_AVATAR,
    status: message.status,
    failureCode: message.failureCode,
    requestId: message.requestId,
    createdAt: message.createdAt,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);

  if (!res.ok && !data?.assistantMessage) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data as T;
}

export default function ChatClient() {
  const [chats, setChats] = useState<ApiChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [titleDraftByChat, setTitleDraftByChat] = useState<Record<string, string>>({});
  const [me, setMe] = useState<MeResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingChat, setSavingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedChat?.subjectId),
    [subjects, selectedChat?.subjectId]
  );
  const selectedChatStarted = Boolean(
    selectedChat?.isStarted ||
      messages.some((message) => message.sender === "user")
  );
  const titleDraft = selectedChat
    ? titleDraftByChat[selectedChat.id] ?? selectedChat.title
    : "";

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const loadBootstrapData = async () => {
      setLoadingChats(true);
      try {
        const [meResponse, materialsResponse, chatsResponse] = await Promise.all([
          fetch("/api/v1/me", { cache: "no-store" }),
          fetch("/api/v1/materials/overview", { cache: "no-store" }),
          fetch(`/api/v1/ai/chats?page=1&pageSize=${CHAT_PAGE_SIZE}`, {
            cache: "no-store",
          }),
        ]);

        if (meResponse.ok) {
          setMe((await meResponse.json()) as MeResponse);
        }
        if (materialsResponse.ok) {
          const data = (await materialsResponse.json()) as MaterialsOverviewResponse;
          setSubjects(data.subjects ?? []);
        }
        if (!chatsResponse.ok) {
          throw new Error("Could not load chat history.");
        }

        const data = (await chatsResponse.json()) as { chats: ApiChat[] };
        const orderedChats = sortChats(data.chats ?? []);
        setChats(orderedChats);
        setSelectedChatId((current) => current ?? orderedChats[0]?.id ?? null);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoadingChats(false);
      }
    };

    void loadBootstrapData();
  }, []);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }

    let ignore = false;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await fetchJson<{ messages: ApiMessage[] }>(
          `/api/v1/ai/chats/${selectedChatId}/messages?page=1&pageSize=${MESSAGE_PAGE_SIZE}`,
          { cache: "no-store" }
        );

        if (ignore) return;
        setMessages(
          sortApiMessages(data.messages ?? []).map((message) =>
            toChatMessageData(message, me?.profile?.avatarUrl)
          )
        );
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError((err as Error).message);
        }
      } finally {
        if (!ignore) setLoadingMessages(false);
      }
    };

    void loadMessages();
    return () => {
      ignore = true;
    };
  }, [selectedChatId, me?.profile?.avatarUrl]);

  const upsertChat = (chat: ApiChat) => {
    setChats((prev) =>
      sortChats([chat, ...prev.filter((item) => item.id !== chat.id)])
    );
  };

  const createChat = async () => {
    setSavingChat(true);
    setError(null);
    try {
      const data = await fetchJson<{ chat: ApiChat }>("/api/v1/ai/chats", {
        method: "POST",
        body: JSON.stringify({}),
      });
      upsertChat(data.chat);
      setSelectedChatId(data.chat.id);
      setMessages([]);
      return data.chat;
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      return null;
    } finally {
      setSavingChat(false);
    }
  };

  const patchSelectedChat = async (updates: Partial<ApiChat>) => {
    if (!selectedChatId) return;

    setSavingChat(true);
    setError(null);
    try {
      const data = await fetchJson<{ chat: ApiChat }>(
        `/api/v1/ai/chats/${selectedChatId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        }
      );
      upsertChat(data.chat);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSavingChat(false);
    }
  };

  const deleteSelectedChat = async () => {
    if (!selectedChatId) return;
    const chatId = selectedChatId;

    setSavingChat(true);
    setError(null);
    try {
      await fetchJson<{ success: boolean }>(`/api/v1/ai/chats/${chatId}`, {
        method: "DELETE",
      });
      setChats((prev) => {
        const remaining = prev.filter((chat) => chat.id !== chatId);
        setSelectedChatId(remaining[0]?.id ?? null);
        return remaining;
      });
      setMessages([]);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSavingChat(false);
    }
  };

  const applyGenerationResponse = (data: GenerationResponse) => {
    upsertChat(data.chat);
    setMessages((prev) => {
      const user = toChatMessageData(data.userMessage, me?.profile?.avatarUrl);
      const assistant = toChatMessageData(
        data.assistantMessage,
        me?.profile?.avatarUrl
      );
      const incoming = new Map<string | number, ChatMessageData>([
        [user.id, user],
        [assistant.id, assistant],
      ]);
      const seen = new Set<string | number>();
      const updated = prev.map((message) => {
        const replacement = incoming.get(message.id);
        if (!replacement) return message;
        seen.add(message.id);
        return replacement;
      });

      for (const message of [user, assistant]) {
        if (!seen.has(message.id)) updated.push(message);
      }

      return sortChatMessages(updated);
    });
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setError(null);
    setSending(true);

    let chat = selectedChat;
    if (!chat) {
      chat = await createChat();
      if (!chat) {
        setSending(false);
        return;
      }
    }

    const clientRequestId = crypto.randomUUID();
    const optimisticUserId = `optimistic-user-${clientRequestId}`;
    const optimisticAssistantId = `optimistic-ai-${clientRequestId}`;

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticUserId,
        sender: "user",
        name: "You",
        text: message,
        avatar: me?.profile?.avatarUrl ?? DEFAULT_USER_AVATAR,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
      },
      {
        id: optimisticAssistantId,
        sender: "ai",
        name: "AI Tutor",
        text: "",
        avatar: AI_AVATAR,
        status: "PENDING",
        createdAt: new Date(Date.now() + 1).toISOString(),
      },
    ]);

    try {
      const data = await fetchJson<GenerationResponse>(
        `/api/v1/ai/chats/${chat.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message, clientRequestId }),
        }
      );

      setMessages((prev) =>
        prev.filter(
          (item) =>
            item.id !== optimisticUserId && item.id !== optimisticAssistantId
        )
      );
      applyGenerationResponse(data);

      if (data.error) {
        setError(data.error.code);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === optimisticAssistantId
            ? {
                ...item,
                status: "FAILED",
                failureCode: "INTERNAL_ERROR",
              }
            : item
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (message: ChatMessageData) => {
    if (!selectedChatId || !message.requestId) return;

    setError(null);
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? { ...item, status: "PENDING", text: "", failureCode: null, retrying: true }
          : item
      )
    );

    try {
      const data = await fetchJson<GenerationResponse>(
        `/api/v1/ai/chats/${selectedChatId}/requests/${message.requestId}/retry`,
        { method: "POST" }
      );
      applyGenerationResponse(data);
      if (data.error) {
        setError(data.error.code);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? { ...item, status: "FAILED", retrying: false }
            : item
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="w-[90vw] max-w-6xl mx-auto py-6 min-h-[calc(100vh-120px)]">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <Heading1 gutter="sm">AI Chat</Heading1>
          <Paragraph variant="superMuted" gutter="none">
            Ask study questions and keep the thread after refresh.
          </Paragraph>
        </div>
        <Button
          variant="primary"
          onClick={() => void createChat()}
          loading={savingChat}
          icon={<Plus size={18} />}
        >
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <aside className="border border-accent-200 rounded-2xl bg-white shadow-sm p-3 h-fit lg:max-h-[calc(100vh-190px)] overflow-y-auto">
          {loadingChats ? (
            <Paragraph variant="muted" gutter="none" className="text-sm">
              Loading chats...
            </Paragraph>
          ) : chats.length === 0 ? (
            <Paragraph variant="muted" gutter="none" className="text-sm">
              No saved chats yet.
            </Paragraph>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                    chat.id === selectedChatId
                      ? "border-primary-400 bg-primary-50 text-primary-900"
                      : "border-transparent hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageCircle size={16} />
                    <span className="font-semibold truncate">{chat.title}</span>
                  </span>
                  <span className="block text-xs text-gray-500 truncate mt-1">
                    {chat.topic?.title ?? chat.subject?.name ?? "General chat"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex flex-col gap-3 min-h-[calc(100vh-190px)]">
          <div className="border border-accent-200 rounded-2xl bg-white shadow-sm p-4 space-y-3">
            {selectedChat ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    value={titleDraft}
                    onChange={(e) =>
                      setTitleDraftByChat((prev) => ({
                        ...prev,
                        [selectedChat.id]: e.target.value,
                      }))
                    }
                    className="min-w-0 flex-1 border border-accent-200 rounded-lg px-3 py-2 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-300"
                    maxLength={120}
                    aria-label="Chat title"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void patchSelectedChat({ title: titleDraft })}
                    disabled={savingChat || !titleDraft.trim()}
                    icon={<Pencil size={16} />}
                  >
                    Save
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void deleteSelectedChat()}
                    disabled={savingChat}
                    icon={<Trash2 size={16} />}
                    ariaLabel="Delete chat"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm font-semibold text-gray-900">
                    Subject
                    <select
                      value={selectedChat.subjectId ?? ""}
                      onChange={(e) =>
                        void patchSelectedChat({
                          subjectId: e.target.value || null,
                          topicId: null,
                        })
                      }
                      disabled={savingChat || selectedChatStarted}
                      className="w-full rounded-lg border border-accent-200 px-3 py-2 bg-white font-normal focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">General</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.displayName ?? subject.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-semibold text-gray-900">
                    Topic
                    <select
                      value={selectedChat.topicId ?? ""}
                      onChange={(e) =>
                        void patchSelectedChat({
                          topicId: e.target.value || null,
                        })
                      }
                      disabled={
                        savingChat ||
                        !selectedChat.subjectId ||
                        selectedChatStarted
                      }
                      className="w-full rounded-lg border border-accent-200 px-3 py-2 bg-white font-normal focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">No topic</option>
                      {(selectedSubject?.topics ?? []).map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <Paragraph variant="muted" gutter="none">
                Create a chat to start asking questions.
              </Paragraph>
            )}
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto border border-accent-200 rounded-2xl bg-white shadow-sm p-4 min-h-[360px]"
          >
            {loadingMessages ? (
              <Paragraph variant="muted" gutter="none">
                Loading messages...
              </Paragraph>
            ) : messages.length === 0 ? (
              <div className="h-full min-h-[260px] flex items-center justify-center text-center">
                <Paragraph variant="muted" gutter="none" className="max-w-md">
                  Ask a study question to start this saved chat.
                </Paragraph>
              </div>
            ) : (
              <ChatMessageContainer messages={messages} onRetry={handleRetry} />
            )}
          </div>

          {error && (
            <Paragraph variant="error" className="mt-1">
              {error}
            </Paragraph>
          )}

          <div className="border border-accent-200 rounded-2xl bg-white shadow-sm p-4 space-y-3">
            <textarea
              className="w-full border border-accent-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900 max-h-28"
              placeholder="Ask a study question... Shift+Enter for new line"
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || loadingChats}
              maxLength={4000}
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Paragraph variant="muted" gutter="none" className="text-sm">
                {input.length}/4000
              </Paragraph>
              <Button
                variant="primary"
                onClick={handleSend}
                loading={sending}
                disabled={sending || loadingChats || !input.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
