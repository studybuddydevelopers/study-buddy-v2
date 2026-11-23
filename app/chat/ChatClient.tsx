// app/chat/ChatClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, LockKeyhole, Pencil, Search, SlidersHorizontal, SquarePen, Trash2, X } from "lucide-react";
import Image from "@/components/Image";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import ChatMessageContainer, {
  type ChatCitationData,
  type ChatMessageData,
} from "@/components/ChatMessageContainer";
import ChatConversationLoading from "@/components/ChatConversationLoading";
import ChatResponseReportDialog from "@/components/ChatResponseReportDialog";
import {
  getChatErrorMessage,
  isGenerationFailureCode,
} from "@/components/chatFailureCopy";

const AI_AVATAR = "/images/ai-tutor-avatar.svg";
const DEFAULT_USER_AVATAR = "/images/profile-avatar.svg";
const CHAT_PAGE_SIZE = 25;
const MESSAGE_PAGE_SIZE = 50;
const EMPTY_CHAT_DRAFT = { title: "", subjectId: null as string | null, topicId: null as string | null };

function trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first) {
    event.preventDefault();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

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
  grounding: {
    attemptId: string;
    insufficientContext: boolean;
    sufficiencyStatus: string;
    sufficiencyReason: string;
    confidence: string;
  } | null;
  citations: ChatCitationData[];
}

interface GenerationResponse {
  chat: ApiChat;
  userMessage: ApiMessage;
  assistantMessage: ApiMessage;
  error?: { code: string; status: number };
}

interface CitationPreviewResponse {
  citation: {
    id: string;
    sourceLabel: string;
    isCurrentForMessage: boolean;
    isActiveResourceVersion: boolean;
    contentHashMatches: boolean;
  };
  resource: {
    id: string;
    title: string;
    sourceKind: string;
  };
  chunk: {
    id: string;
    title: string | null;
    chunkType: string;
    pageStart: number | null;
    pageEnd: number | null;
    questionNumber: string | null;
    excerpt: string;
  };
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
    name: isUser ? "You" : "AI Study Buddy Tutor",
    text: message.content,
    avatar: isUser ? userAvatar ?? DEFAULT_USER_AVATAR : AI_AVATAR,
    status: message.status,
    failureCode: message.failureCode,
    requestId: message.requestId,
    createdAt: message.createdAt,
    grounding: message.grounding,
    citations: message.citations ?? [],
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
  const [chatDraft, setChatDraft] = useState(EMPTY_CHAT_DRAFT);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingChat, setSavingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citationPreview, setCitationPreview] =
    useState<CitationPreviewResponse | null>(null);
  const [loadingCitationId, setLoadingCitationId] = useState<string | null>(null);
  const [chatPendingDeletion, setChatPendingDeletion] =
    useState<ApiChat | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportedMessage, setReportedMessage] = useState<ChatMessageData | null>(null);
  const [searchMode, setSearchMode] = useState<"inline" | "dialog" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiChat[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchRetry, setSearchRetry] = useState(0);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
  const historyDialogRef = useRef<HTMLDialogElement | null>(null);
  const historyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const searchDialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogSearchRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchRef = useRef<HTMLInputElement | null>(null);
  const desktopSearchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileSearchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const citationPreviewRef = useRef<HTMLDivElement | null>(null);
  const newChatIdRef = useRef<string | null>(null);
  const followLatestRef = useRef(true);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );
  const chatSettings = selectedChat ?? chatDraft;

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === chatSettings.subjectId),
    [subjects, chatSettings.subjectId]
  );
  const selectedChatStarted = Boolean(
    selectedChat?.isStarted ||
      messages.some((message) => message.sender === "user")
  );
  const titleDraft = selectedChat
    ? titleDraftByChat[selectedChat.id] ?? selectedChat.title
    : chatDraft.title;
  const replying = sending || messages.some((message) => message.retrying && message.status === "PENDING");
  const busy = savingChat || replying;
  const composerDisabled = busy || loadingChats || loadingMessages;
  const composerPlaceholder = replying
    ? "Study Buddy is replying…"
    : loadingChats || loadingMessages
      ? "Loading conversations…"
      : savingChat ? "Saving chat…" : "Ask Study Buddy…";
  const composerStatus = replying
    ? "Replying — input paused"
    : loadingChats || loadingMessages
      ? "Loading — input paused"
      : savingChat ? "Saving — input paused" : "";
  const emptyConversation = !loadingChats && !loadingMessages && messages.length === 0;
  const searchOpen = searchMode !== null;
  const searchingTitles = searchOpen && Boolean(searchQuery.trim());

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchLoading(false);
    setSearchError(false);
    setSearchRetry(0);
  };

  const updateSearchQuery = (query: string) => {
    setSearchQuery(query);
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchLoading(Boolean(query.trim()));
    setSearchError(false);
  };

  const retrySearch = () => {
    setSearchLoading(true);
    setSearchError(false);
    setSearchRetry((attempt) => attempt + 1);
  };

  const showMoreSearchResults = () => {
    setSearchLoading(true);
    setSearchError(false);
    setSearchPage((page) => page + 1);
  };

  useEffect(() => {
    if (searchMode !== "inline" || !mobileHistoryOpen) return;
    const frame = requestAnimationFrame(() => mobileSearchRef.current?.focus());
    const tablet = window.matchMedia("(min-width: 768px)");
    const openPopupOnTablet = () => { if (tablet.matches) setSearchMode("dialog"); };
    tablet.addEventListener("change", openPopupOnTablet);
    return () => {
      cancelAnimationFrame(frame);
      tablet.removeEventListener("change", openPopupOnTablet);
    };
  }, [searchMode, mobileHistoryOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || !query) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, page: String(searchPage), pageSize: String(CHAT_PAGE_SIZE) });
        const data = await fetchJson<{ chats: ApiChat[]; pagination: { hasNextPage: boolean } }>(
          `/api/v1/ai/chats?${params}`, { cache: "no-store", signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setSearchResults((previous) => searchPage === 1
          ? data.chats
          : [...previous, ...data.chats.filter((chat) => !previous.some((item) => item.id === chat.id))]);
        setSearchHasMore(Boolean(data.pagination?.hasNextPage));
      } catch {
        if (!controller.signal.aborted) setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, searchPage === 1 ? 250 : 0);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [searchOpen, searchQuery, searchPage, searchRetry]);

  useEffect(() => {
    if (!followLatestRef.current || messages.length === 0) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    if (!citationPreview && !loadingCitationId) return;
    citationPreviewRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [citationPreview, loadingCitationId]);

  useEffect(() => {
    if (!mobileHistoryOpen) return;
    const dialog = historyDialogRef.current;
    const trigger = historyTriggerRef.current;
    const composer = composerRef.current;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileHistoryOpen(false); };
    dialog?.showModal();
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      dialog?.close();
      if (desktop.matches) composer?.focus();
      else trigger?.focus();
    };
  }, [mobileHistoryOpen]);

  useEffect(() => {
    if (searchMode !== "dialog") return;
    const dialog = searchDialogRef.current;
    const desktopTrigger = desktopSearchTriggerRef.current;
    const mobileTrigger = mobileSearchTriggerRef.current;
    const composer = composerRef.current;
    dialog?.showModal();
    dialogSearchRef.current?.focus();
    return () => {
      dialog?.close();
      const trigger = [mobileTrigger, desktopTrigger].find((element) => element?.isConnected && element.getClientRects().length > 0);
      (trigger ?? composer)?.focus();
    };
  }, [searchMode]);

  useEffect(() => {
    if (!chatPendingDeletion) return;

    const dialog = deleteDialogRef.current;
    const previousFocus = document.activeElement;
    const composer = composerRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      } else {
        composer?.focus();
      }
    };
  }, [chatPendingDeletion]);

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
    // A newly created chat is already known to be empty. A concurrent history
    // fetch could replace its first optimistic turn with an empty response.
    if (newChatIdRef.current === selectedChatId) {
      newChatIdRef.current = null;
      setLoadingMessages(false);
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

  const selectChat = (chatId: string) => {
    setSearchMode(null);
    resetSearch();
    if (chatId !== selectedChatId) {
      setMessages([]);
      setLoadingMessages(true);
    }
    followLatestRef.current = true;
    setAwayFromLatest(false);
    setMobileHistoryOpen(false);
    setSettingsOpen(false);
    setError(null);
    setInput("");
    setChatDraft(EMPTY_CHAT_DRAFT);
    setCitationPreview(null);
    setSelectedChatId(chatId);
  };

  const closeMobileHistory = () => {
    setMobileHistoryOpen(false);
    if (searchMode === "inline") setSearchMode(null);
  };

  const startNewChat = () => {
    if (busy || loadingChats) return;
    setSearchMode(null);
    resetSearch();
    setSelectedChatId(null);
    setMessages([]);
    setLoadingMessages(false);
    setInput("");
    setChatDraft(EMPTY_CHAT_DRAFT);
    setError(null);
    setCitationPreview(null);
    setLoadingCitationId(null);
    setSettingsOpen(false);
    setMobileHistoryOpen(false);
    followLatestRef.current = true;
    setAwayFromLatest(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const handleCitationClick = async (citation: ChatCitationData) => {
    if (!selectedChatId) return;
    setLoadingCitationId(citation.id);
    setError(null);
    try {
      const data = await fetchJson<CitationPreviewResponse>(
        `/api/v1/ai/chats/${selectedChatId}/citations/${citation.id}`,
        { cache: "no-store" }
      );
      setCitationPreview(data);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setLoadingCitationId(null);
    }
  };

  const createChat = async () => {
    setSavingChat(true);
    setError(null);
    try {
      const data = await fetchJson<{ chat: ApiChat }>("/api/v1/ai/chats", {
        method: "POST",
        body: JSON.stringify({
          title: chatDraft.title.trim() || undefined,
          subjectId: chatDraft.subjectId,
          topicId: chatDraft.topicId,
        }),
      });
      newChatIdRef.current = data.chat.id;
      upsertChat(data.chat);
      selectChat(data.chat.id);
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

  const patchSelectedChat = async (updates: Partial<Pick<ApiChat, "title" | "subjectId" | "topicId">>) => {
    if (!selectedChatId) {
      setChatDraft((draft) => ({ ...draft, ...updates }));
      return;
    }

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

  const deleteSelectedChat = async (chatId: string) => {
    setSavingChat(true);
    setError(null);
    try {
      await fetchJson<{ success: boolean }>(`/api/v1/ai/chats/${chatId}`, {
        method: "DELETE",
      });
      setChats((prev) => {
        const remaining = prev.filter((chat) => chat.id !== chatId);
        setCitationPreview(null);
        setSelectedChatId(remaining[0]?.id ?? null);
        return remaining;
      });
      setMessages([]);
      setChatDraft(EMPTY_CHAT_DRAFT);
      setChatPendingDeletion(null);
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
    if (!message || busy || loadingChats || loadingMessages) return;

    followLatestRef.current = true;
    setInput("");
    setError(null);
    setSending(true);

    let chat = selectedChat;
    if (!chat) {
      chat = await createChat();
      if (!chat) {
        setInput(message);
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
        name: "AI Study Buddy Tutor",
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

      if (data.error && !isGenerationFailureCode(data.error.code)) {
        setError(getChatErrorMessage(data.error.code));
      }
    } catch (err) {
      console.error(err);
      setError(getChatErrorMessage(err));
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
      if (data.error && !isGenerationFailureCode(data.error.code)) {
        setError(getChatErrorMessage(data.error.code));
      }
    } catch (err) {
      console.error(err);
      setError(getChatErrorMessage(err));
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
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const searchField = (location: "mobile" | "dialog") => (
    <div id={`chat-search-${location}`} className="chat-title-search flex shrink-0 items-center gap-2 rounded-xl border border-primary-200 bg-white pl-3">
      {location === "dialog" && <Search size={20} className="shrink-0 text-primary-700" aria-hidden="true" />}
      <input
        ref={location === "mobile" ? mobileSearchRef : dialogSearchRef}
        type="search"
        aria-label="Search chat titles"
        placeholder="Search by title…"
        value={searchQuery}
        maxLength={120}
        onChange={(event) => updateSearchQuery(event.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent py-2 text-sm text-gray-900 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {searchQuery && <button type="button" aria-label="Clear chat search" onClick={() => { resetSearch(); (location === "mobile" ? mobileSearchRef : dialogSearchRef).current?.focus(); }} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-700 hover:bg-primary-50"><X size={18} aria-hidden="true" /></button>}
    </div>
  );

  const historyList = (searchActive: boolean) => (
    <>
      <h2 className="px-3 pb-3 pt-2 text-xs font-semibold text-primary-700">Your chats</h2>
      {searchActive && <p role="status" className="mb-2 px-3 text-xs text-gray-600">{searchLoading ? "Searching chats…" : searchError ? "" : searchResults.length === 0 ? "No chats match this title." : `${searchResults.length} matching ${searchResults.length === 1 ? "chat" : "chats"}${searchHasMore ? " shown" : ""}`}</p>}
      {searchActive && searchError && <div className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><p role="alert">Could not search your chats.</p><button type="button" onClick={retrySearch} className="mt-1 min-h-11 rounded-lg px-2 font-medium underline">Try search again</button></div>}
      {loadingChats && !searchActive ? (
        <p role="status" className="px-3 text-sm text-gray-600">Loading chats…</p>
      ) : chats.length === 0 && !searchActive ? (
        <p className="px-3 text-sm leading-relaxed text-gray-600">Your conversations will appear here after you send your first message.</p>
      ) : (
        <nav aria-label={searchActive ? "Chat search results" : "Saved chats"} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
          <ul className="space-y-1">
            {(searchActive ? searchResults : chats).map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => { if (searchActive) upsertChat(chat); selectChat(chat.id); }}
                  disabled={busy}
                  aria-current={chat.id === selectedChatId ? "true" : undefined}
                  className={"w-full rounded-xl px-3 py-3 text-left text-sm transition-colors disabled:cursor-wait " + (
                    chat.id === selectedChatId
                      ? "bg-primary-100 font-medium text-primary-900"
                      : "text-gray-700 hover:bg-accent-700"
                  )}
                  title={chat.title}
                >
                  <span className="block truncate">{chat.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {searchActive && searchHasMore && !searchError && <button type="button" disabled={searchLoading} onClick={showMoreSearchResults} className="mt-3 min-h-11 w-full rounded-xl border border-primary-200 px-3 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 disabled:opacity-50">Show more matches</button>}
        </nav>
      )}
    </>
  );

  const history = (location: "desktop" | "mobile") => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 space-y-1">
        <button type="button" aria-label="New chat in sidebar" onClick={startNewChat} disabled={busy || loadingChats} className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-primary-500 px-3 py-2 text-left text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
          <SquarePen size={20} aria-hidden="true" /><span>New chat</span>
        </button>
        <button
          type="button"
          ref={location === "mobile" ? mobileSearchTriggerRef : desktopSearchTriggerRef}
          aria-expanded={searchOpen}
          aria-haspopup={location === "desktop" ? "dialog" : undefined}
          aria-controls={searchMode === "dialog" ? "chat-search-panel" : searchMode === "inline" && location === "mobile" ? "chat-search-mobile" : undefined}
          onClick={() => {
            resetSearch();
            setSearchMode(window.matchMedia("(min-width: 768px)").matches ? "dialog" : searchMode === "inline" ? null : "inline");
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-primary-800 hover:bg-primary-100"
        >
          <Search size={20} aria-hidden="true" /><span>Search chats</span>
        </button>
        {searchMode === "inline" && location === "mobile" && searchField("mobile")}
      </div>
      {historyList(searchMode === "inline" && location === "mobile" && searchingTitles)}
    </div>
  );

  return (
    <div className="mx-auto my-3 flex h-[calc(100dvh-12rem-env(safe-area-inset-bottom))] min-h-[400px] w-full max-w-[1600px] overflow-hidden rounded-2xl border border-accent-700 bg-white min-[1110px]:h-[calc(100dvh-8rem)]">
      {sidebarOpen && (
        <aside id="chat-history-desktop" aria-label="Chat history" className="hidden w-60 shrink-0 flex-col border-r border-accent-700 bg-primary-50 p-3 lg:flex xl:w-64">
          {history("desktop")}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
          <button
            type="button"
            aria-label={sidebarOpen ? "Hide chat history" : "Show chat history"}
            aria-expanded={sidebarOpen}
            aria-controls={sidebarOpen ? "chat-history-desktop" : undefined}
            onClick={() => setSidebarOpen((open) => !open)}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 lg:inline-flex"
          >
            <StudyBuddyIcon name={sidebarOpen ? "sidebarClose" : "sidebarOpen"} size={36} />
          </button>
          <button
            ref={historyTriggerRef}
            type="button"
            aria-label="Show chat history"
            aria-haspopup="dialog"
            aria-expanded={mobileHistoryOpen}
            onClick={() => setMobileHistoryOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 lg:hidden"
          >
            <StudyBuddyIcon name="sidebarOpen" size={36} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="sr-only">AI Study Buddy Tutor</h1>
            {selectedChat && <p className="truncate text-sm font-medium text-primary-900">{selectedChat.title}</p>}
          </div>
          <button
            type="button"
            aria-label="Chat settings"
            aria-expanded={settingsOpen}
            aria-controls="chat-settings"
            disabled={loadingChats}
            onClick={() => setSettingsOpen((open) => !open)}
            className={"inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium hover:bg-primary-50 disabled:opacity-50 " + (settingsOpen ? "bg-primary-100 text-primary-800" : "text-gray-600")}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            aria-label="New chat"
            onClick={startNewChat}
            disabled={busy || loadingChats}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-primary-700 hover:bg-primary-50 disabled:cursor-wait disabled:opacity-50"
          >
            <SquarePen size={21} aria-hidden="true" />
            <span className="hidden text-sm font-medium sm:inline">New chat</span>
          </button>
        </header>

        <section id="chat-settings" aria-label="Chat settings" hidden={!settingsOpen} className="max-h-[45%] shrink-0 overflow-y-auto border-y border-accent-700 bg-primary-50 px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center gap-2">
              <input
                value={titleDraft}
                onChange={(e) => selectedChat
                  ? setTitleDraftByChat((prev) => ({ ...prev, [selectedChat.id]: e.target.value }))
                  : setChatDraft((draft) => ({ ...draft, title: e.target.value }))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-accent-800 bg-white px-3 py-2 font-medium text-gray-900"
                maxLength={120}
                aria-label="Chat title"
                placeholder="New chat"
              />
              {selectedChat && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void patchSelectedChat({ title: titleDraft })}
                    disabled={busy || !titleDraft.trim()}
                    ariaLabel="Save chat title"
                    className="min-h-11 min-w-11"
                    icon={<Pencil className="h-[18px] w-[18px] text-white" aria-hidden="true" />}
                  >
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setError(null); setChatPendingDeletion(selectedChat); }}
                    disabled={busy}
                    className="min-h-11 min-w-11"
                    icon={<Trash2 className="h-[18px] w-[18px] text-white" aria-hidden="true" />}
                    ariaLabel="Delete chat"
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-gray-900">
                Subject
                <select
                  value={chatSettings.subjectId ?? ""}
                  onChange={(e) => void patchSelectedChat({ subjectId: e.target.value || null, topicId: null })}
                  disabled={busy || selectedChatStarted}
                  className="min-h-11 w-full rounded-xl border border-accent-800 bg-white px-3 py-2 font-normal disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">General</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.displayName ?? subject.name}</option>)}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-gray-900">
                Topic
                <select
                  value={chatSettings.topicId ?? ""}
                  onChange={(e) => void patchSelectedChat({ topicId: e.target.value || null })}
                  disabled={busy || !chatSettings.subjectId || selectedChatStarted}
                  className="min-h-11 w-full rounded-xl border border-accent-800 bg-white px-3 py-2 font-normal disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">No topic</option>
                  {(selectedSubject?.topics ?? []).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
                </select>
              </label>
            </div>
            {selectedChatStarted && <p className="text-xs text-gray-600">Subject and topic are fixed after your first message. Start a new chat to change them.</p>}
            {!selectedChat && <p className="text-xs text-gray-600">This chat is saved when you send your first message.</p>}
          </div>
        </section>

        <div className={"flex min-h-0 flex-1 flex-col " + (emptyConversation ? "justify-center" : "")}>
          <div
            ref={listRef}
            role="region"
            aria-label="Chat messages"
            tabIndex={0}
            onScroll={(event) => {
              const list = event.currentTarget;
              const away = list.scrollHeight - list.scrollTop - list.clientHeight > 80;
              followLatestRef.current = !away;
              setAwayFromLatest(away);
            }}
            className={"min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 " + (emptyConversation ? "max-h-[45%] shrink" : "flex-1")}
          >
            <div className="mx-auto w-full max-w-3xl py-4 sm:py-6">
              {loadingChats || loadingMessages ? (
                <ChatConversationLoading />
              ) : messages.length === 0 ? (
                <div className="mx-auto max-w-lg text-center">
                  <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-black bg-[#5e3194] sm:h-20 sm:w-20">
                    <Image src={AI_AVATAR} alt="" width={80} height={80} rounded="none" className="!h-auto !w-[90%] -translate-y-0.5 !object-contain" />
                  </span>
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight text-primary-900 sm:text-3xl">What are we learning today?</h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">A tricky topic, a practice question, or a little revision. Let’s work through it.</p>
                </div>
              ) : (
                <ChatMessageContainer messages={messages} onRetry={handleRetry} onCitationClick={handleCitationClick} onReport={setReportedMessage} />
              )}
          {(citationPreview || loadingCitationId) && (
            <div ref={citationPreviewRef} role="region" aria-label="Source preview" className="mt-6 rounded-2xl border border-accent-700 bg-primary-50 p-4">
              {loadingCitationId ? (
                <Paragraph variant="muted" gutter="none" className="text-sm">
                  Loading source...
                </Paragraph>
              ) : citationPreview ? (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {citationPreview.citation.sourceLabel} ·{" "}
                        {citationPreview.resource.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {citationPreview.chunk.title ??
                          citationPreview.chunk.chunkType}
                        {citationPreview.chunk.questionNumber
                          ? ` · Question ${citationPreview.chunk.questionNumber}`
                          : ""}
                        {citationPreview.chunk.pageStart
                          ? ` · Page ${citationPreview.chunk.pageStart}${
                              citationPreview.chunk.pageEnd &&
                              citationPreview.chunk.pageEnd !==
                                citationPreview.chunk.pageStart
                                ? `-${citationPreview.chunk.pageEnd}`
                                : ""
                            }`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCitationPreview(null)}
                      className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                    >
                      Close
                    </button>
                  </div>
                  {(!citationPreview.citation.isActiveResourceVersion ||
                    !citationPreview.citation.contentHashMatches) && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                      This preview shows the historical cited chunk. The current
                      resource version may have changed.
                    </p>
                  )}
                  <p className="text-sm leading-6 text-gray-800">
                    {citationPreview.chunk.excerpt}
                  </p>
                </div>
              ) : null}
            </div>
          )}

            </div>
          </div>

          <div className="relative shrink-0 px-3 pb-3 pt-2 sm:px-6 sm:pb-4">
            {awayFromLatest && !emptyConversation && (
              <button
                type="button"
                aria-label="Jump to latest message"
                onClick={() => {
                  followLatestRef.current = true;
                  listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
                  setAwayFromLatest(false);
                }}
                className="absolute -top-12 left-1/2 inline-flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-accent-700 bg-white text-primary-700 shadow-sm"
              >
                <ArrowDown size={20} aria-hidden="true" />
              </button>
            )}
            <div className="mx-auto w-full max-w-3xl">
              {error && !chatPendingDeletion && (
                <p className="mb-3 max-h-24 overflow-y-auto rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>
              )}
              <form
                aria-label="Send a message"
                onSubmit={(event) => { event.preventDefault(); void handleSend(); }}
                className={"rounded-[26px] border border-accent-800 p-3 transition-colors " + (composerDisabled
                  ? "cursor-not-allowed bg-accent-600"
                  : "bg-primary-50 shadow-sm focus-within:border-primary-400 focus-within:shadow-md")}
              >
                <textarea
                  ref={composerRef}
                  aria-label="Message to AI Study Buddy Tutor"
                  aria-describedby="chat-composer-help chat-composer-status"
                  className="block max-h-[180px] min-h-11 w-full resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-base leading-6 text-gray-900 placeholder:text-gray-500 disabled:cursor-not-allowed disabled:text-gray-600 disabled:placeholder:text-gray-600 disabled:opacity-100"
                  placeholder={composerPlaceholder}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={composerDisabled}
                  maxLength={4000}
                />
                <span id="chat-composer-help" className="sr-only">
                  Press Enter to send, or Shift+Enter for a new line. Maximum 4000 characters.
                </span>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span id="chat-composer-status" role="status" className={composerStatus ? "flex min-w-0 items-center gap-2 px-2 text-xs text-gray-600" : "sr-only"}>
                    {composerStatus && <LockKeyhole size={15} aria-hidden="true" className="shrink-0" />}
                    {composerStatus}
                  </span>
                  {!composerStatus && <span className="min-w-0 truncate px-2 text-xs text-gray-600">
                    {input.length >= 3600 ? input.length + "/4000 characters" : selectedSubject?.displayName ?? selectedSubject?.name ?? "Study Buddy"}
                  </span>}
                  <button
                    type="submit"
                    aria-label={sending ? "Sending message" : "Send message"}
                    disabled={composerDisabled || !input.trim()}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-accent-700 disabled:text-gray-500"
                  >
                    {replying ? <LoaderCircle size={22} className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowUp size={22} aria-hidden="true" />}
                  </button>
                </div>
              </form>
              {emptyConversation && (
                <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Study suggestions">
                  {[
                    { label: "Explain a topic", prompt: "Help me understand " },
                    { label: "Quiz me", prompt: "Give me a practice question on " },
                    { label: "Check my working", prompt: "Help me check my working step by step:\n" },
                  ].map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => { setInput(suggestion.prompt); composerRef.current?.focus(); }}
                      disabled={busy}
                      className="min-h-11 rounded-full border border-accent-700 px-3 py-2 text-xs text-primary-800 hover:border-primary-200 hover:bg-primary-50 disabled:opacity-50"
                    >{suggestion.label}</button>
                  ))}
                </div>
              )}
              <p className="mt-3 text-center text-xs leading-5 text-gray-600">Study Buddy can make mistakes. Check important answers.</p>
            </div>
          </div>
        </div>
      </div>

      {mobileHistoryOpen && (
        <dialog
          ref={historyDialogRef}
          aria-label="Chat history"
          className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-80 max-w-[85vw] border-r border-accent-700 bg-primary-50 p-0 shadow-xl backdrop:bg-gray-950/40"
          onCancel={(event) => { event.preventDefault(); closeMobileHistory(); }}
          onKeyDown={trapDialogFocus}
          onClick={(event) => { if (event.target === event.currentTarget) closeMobileHistory(); }}
        >
          <div className="flex h-full flex-col p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-2">
              <p className="font-semibold text-[#6C3483]">Study Buddy</p>
              <button type="button" aria-label="Close chat history" onClick={closeMobileHistory} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100">
                <StudyBuddyIcon name="sidebarClose" size={36} />
              </button>
            </div>
            {history("mobile")}
          </div>
        </dialog>
      )}

      {searchMode === "dialog" && (
        <dialog
          id="chat-search-panel"
          ref={searchDialogRef}
          aria-labelledby="chat-search-title"
          className="m-auto w-[calc(100%-2rem)] max-w-xl max-h-[80dvh] overflow-hidden rounded-2xl border border-primary-200 bg-white p-0 shadow-2xl backdrop:bg-gray-950/40"
          onCancel={(event) => { event.preventDefault(); setSearchMode(null); }}
          onKeyDown={trapDialogFocus}
          onClick={(event) => { if (event.target === event.currentTarget) setSearchMode(null); }}
        >
          <div className="flex max-h-[80dvh] min-h-80 flex-col p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
              <h2 id="chat-search-title" className="text-xl font-semibold text-[#6C3483]">Search chats</h2>
              <button type="button" aria-label="Close chat search" onClick={() => setSearchMode(null)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary-700 hover:bg-primary-50"><X size={22} aria-hidden="true" /></button>
            </div>
            {searchField("dialog")}
            <div className="mt-4 flex min-h-0 flex-1 flex-col">
              {historyList(searchingTitles)}
            </div>
          </div>
        </dialog>
      )}

      {reportedMessage && selectedChatId && <ChatResponseReportDialog chatId={selectedChatId} message={reportedMessage} onClose={() => setReportedMessage(null)} />}

      {chatPendingDeletion && (
        <dialog
          ref={deleteDialogRef}
          aria-labelledby="delete-chat-title"
          aria-describedby="delete-chat-description"
          className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[85svh] overflow-y-auto rounded-2xl border border-red-200 bg-white p-0 shadow-2xl backdrop:bg-gray-950/60"
          onCancel={(event) => {
            event.preventDefault();
            if (!savingChat) setChatPendingDeletion(null);
          }}
          onKeyDown={trapDialogFocus}
          onClick={(event) => {
            if (event.target === event.currentTarget && !savingChat) {
              setChatPendingDeletion(null);
            }
          }}
        >
          <div
            className="p-6"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-red-50 p-2 text-red-700">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="delete-chat-title"
                  className="text-lg font-bold text-gray-950"
                >
                  Permanently delete this chat?
                </h2>
                <p
                  id="delete-chat-description"
                  className="mt-2 text-sm leading-6 text-gray-600"
                >
                  “{chatPendingDeletion.title}” and all of its messages will be
                  permanently removed from the live service. This cannot be
                  undone.
                </p>
              </div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setChatPendingDeletion(null)}
                disabled={savingChat}
              >
                Keep chat
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  void deleteSelectedChat(chatPendingDeletion.id)
                }
                loading={savingChat}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
