import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askConcierge } from "@/lib/ai.functions";
import { Clock, MessageSquare, Trash2, ChevronDown } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; timestamp?: number };

type ChatSession = {
  id: string;
  title: string;
  messages: Msg[];
  createdAt: number;
  updatedAt: number;
};

const GREETING: Msg = {
  role: "assistant",
  content:
    "Welcome to Kalashetra. I can help you find lots, explain live bidding windows, buyer's premium, registration or consigning a work. What are you looking for?",
};

// Storage keys
const STORAGE_KEY = "kalashetra_concierge_sessions";
const CURRENT_SESSION_KEY = "kalashetra_concierge_current";

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function Concierge() {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askConcierge);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load sessions from storage on mount
  useEffect(() => {
    const savedSessions = loadSessions();
    setSessions(savedSessions);
    
    const savedCurrentId = localStorage.getItem(CURRENT_SESSION_KEY);
    if (savedCurrentId) {
      const currentSession = savedSessions.find(s => s.id === savedCurrentId);
      if (currentSession) {
        setCurrentSessionId(savedCurrentId);
        setMessages(currentSession.messages);
      }
    }
  }, []);

  // Save sessions when they change
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const createNewSession = useCallback(() => {
    const newId = generateSessionId();
    const newSession: ChatSession = {
      id: newId,
      title: "New conversation",
      messages: [GREETING],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([GREETING]);
    localStorage.setItem(CURRENT_SESSION_KEY, newId);
  }, []);

  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
      setShowHistory(false);
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      createNewSession();
    }
  }, [currentSessionId, createNewSession]);

  const updateSessionTitle = useCallback((sessionId: string, firstUserMessage: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId && s.title === "New conversation") {
        return { ...s, title: firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? "..." : "") };
      }
      return s;
    }));
  }, []);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    
    // Create new session if none exists
    if (!currentSessionId) {
      createNewSession();
    }
    
    const userMsg: Msg = { role: "user" as const, content: q, timestamp: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);
    
    // Update session title with first user message
    const userMessages = next.filter(m => m.role === "user");
    if (userMessages.length === 1 && currentSessionId) {
      updateSessionTitle(currentSessionId, q);
    }
    
    try {
      const res: any = await ask({ data: { messages: next.filter((m) => m !== GREETING).slice(-12) } });
      const assistantMsg: Msg = { 
        role: "assistant", 
        content: res.reply || res.error || "I couldn't answer that just now.",
        timestamp: Date.now()
      };
      const finalMessages = [...next, assistantMsg];
      setMessages(finalMessages);
      
      // Update session in storage
      if (currentSessionId) {
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, messages: finalMessages, updatedAt: Date.now() };
          }
          return s;
        }));
      }
    } catch (e: any) {
      const errorMsg: Msg = { 
        role: "assistant", 
        content: e?.message ?? "Something went wrong.",
        timestamp: Date.now()
      };
      setMessages([...next, errorMsg]);
      
      if (currentSessionId) {
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...next, errorMsg], updatedAt: Date.now() };
          }
          return s;
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ["What's open for live bidding?", "How does buyer's premium work?", "How do I consign a painting?"];

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(92vw,400px)] border border-border bg-background shadow-2xl flex flex-col max-h-[75vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 hover:bg-muted transition-colors"
                title="Chat history"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
              </button>
              <div>
                <div className="font-serif text-lg leading-none">Concierge</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Kalashetra · AI guide</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={createNewSession}
                className="p-1.5 hover:bg-muted transition-colors"
                title="New conversation"
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close concierge" className="font-mono text-[11px] text-muted-foreground hover:text-foreground">✕</button>
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="border-b border-border bg-muted/30 max-h-[200px] overflow-y-auto">
              <div className="p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Recent Conversations</div>
                {sessions.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground py-2">No conversations yet</div>
                ) : (
                  <div className="space-y-1">
                    {sessions.slice(0, 10).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => loadSession(session.id)}
                        className={`w-full text-left p-2 hover:bg-background transition-colors flex items-center justify-between group ${
                          currentSessionId === session.id ? "bg-background" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium truncate">{session.title}</div>
                          <div className="text-[10px] text-muted-foreground">{formatSessionDate(session.updatedAt)}</div>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div className={`inline-block max-w-[88%] text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-foreground text-background px-4 py-2.5" : "border border-border px-4 py-2.5"}`}>
                  {m.content}
                </div>
                {m.timestamp && (
                  <div className={`text-[9px] text-muted-foreground mt-1 ${m.role === "user" ? "text-right" : ""}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Consulting the catalogue…</div>}
            {messages.length === 1 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="border border-border px-3 py-1.5 text-[11px] hover:border-foreground transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a lot, a sale, or bidding…"
              className="flex-1 bg-transparent px-2 py-2 text-[13px] focus:outline-none"
            />
            <button type="submit" disabled={busy || !input.trim()} className="bg-foreground text-background px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">Send</button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open the Kalashetra concierge"
        className="fixed bottom-5 right-5 z-50 border border-foreground bg-background px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors shadow-lg"
      >
        {open ? "Close" : "Ask Concierge"}
      </button>
    </>
  );
}
