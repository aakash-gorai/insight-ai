"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

type Message = { role: "user" | "ai"; text: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const api = process.env.NEXT_PUBLIC_INSIGHTAI_API_BASE_URL;

  // Check session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const session_id = sessionStorage.getItem("session_id");
    if (!session_id) {
      toast.error("Please upload a file before chatting.");
      router.push("/");
      return;
    }

    const handleUnload = async () => {
      try {
        await fetch(`${api}/delete-session?session_id=${session_id}`, {
          method: "DELETE",
        });
      } catch {}
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Idle timeout
  useEffect(() => {
    if (typeof window === "undefined") return;

    const IDLE_TIMEOUT = 15 * 60 * 1000;
    const session_id = sessionStorage.getItem("session_id");
    if (!session_id) return;

    let idleTimer: any;

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        try {
          await fetch(`${api}/delete-session?session_id=${session_id}`, {
            method: "DELETE",
          });
        } catch {}

        sessionStorage.clear();
        toast.error("Session expired due to inactivity.");
        router.push("/");
      }, IDLE_TIMEOUT);
    }

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer));
    resetIdleTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      clearTimeout(idleTimer);
    };
  }, []);

  async function sendMessage() {
    if (typeof window === "undefined") return;

    const session_id = sessionStorage.getItem("session_id");
    if (!session_id) {
      toast.error("Session expired. Please re-upload.");
      router.push("/");
      return;
    }
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${api}/chat`, {
        session_id,
        prompt: userMsg.text,
      });

      const aiText = res.data.response || "No response.";
      setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Chat failed.");
    } finally {
      setLoading(false);
    }
  }

  const source =
    typeof window !== "undefined"
      ? sessionStorage.getItem("source_name") || "your document"
      : "your document";

  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 px-3 sm:px-6 py-4 text-gray-200">
      {/* Outer card */}
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full min-h-0 rounded-2xl bg-gray-900/70 backdrop-blur-xl shadow-xl border border-gray-800 p-4 sm:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              💬 Chat with {source}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Ask questions about the uploaded content.
            </p>
          </div>

          {/* SMALL button on mobile, normal on desktop */}
          <button
            onClick={() => {
              if (typeof window === "undefined") return;
              const sid = sessionStorage.getItem("session_id");
              if (sid) {
                fetch(`${api}/delete-session?session_id=${sid}`, {
                  method: "DELETE",
                });
              }
              sessionStorage.clear();
              router.push("/");
            }}
            className="px-3 py-1.5 text-xs sm:text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition w-fit self-center sm:self-auto"
          >
            End Chat
          </button>

        </div>

        {/* Chat area */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-gray-800/40 border border-gray-700">
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            {messages.length === 0 && (
              <div className="text-gray-500 text-center mt-8 text-sm">
                No messages yet — ask something about the document.
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] break-words p-3 rounded-xl text-sm sm:text-base ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-200"
                  }`}
                >
                  <b className="block text-[10px] sm:text-xs opacity-70 mb-1">
                    {m.role === "user" ? "You" : "AI"}
                  </b>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}

            <div ref={scrollRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="mt-3 sm:mt-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask something..."
              disabled={loading}
              className="flex-1 bg-gray-800 text-gray-200 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-600"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 rounded-lg font-medium text-sm sm:text-base disabled:opacity-50"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
