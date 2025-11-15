"use client";

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

  //chceck if session_id exists on mount
  useEffect(() => {
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

  //scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //idle timeout to clear session after 15 minutes of inactivity
  useEffect(() => {
    const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
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

    // events that count as "activity"
    const events = ["mousemove", "keydown", "click", "scroll"];

    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer));

    resetIdleTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      clearTimeout(idleTimer);
    };
  }, []);

  async function sendMessage() {
    const session_id = sessionStorage.getItem("session_id");
    if (!session_id) {
      toast.error("Session expired. Please upload again.");
      router.push("/");
      return;
    }

    if (!input.trim()) return;

    const userMsg: Message = { role: "user", text: input.trim() };
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
      toast.error(
        err?.response?.data?.detail || "Chat failed. Please re-upload."
      );
    } finally {
      setLoading(false);
    }
  }

  const source = sessionStorage.getItem("source_name") || "your document";

  return (
    <main
      className="flex flex-col min-h-screen bg-gradient-to-br 
      from-black via-gray-900 to-gray-800 p-6 text-gray-200"
    >
      <div
        className="max-w-3xl w-full mx-auto flex flex-col flex-1 
        bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-xl 
        border border-gray-700 p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              💬 Chat with {source}
            </h1>
            <p className="text-sm text-gray-400">
              Ask questions about the uploaded content.
            </p>
          </div>

          <button
            onClick={() => {
              const sid = sessionStorage.getItem("session_id");
              if (sid) {
                fetch(`${api}/delete-session?session_id=${sid}`, {
                  method: "DELETE",
                });
              }
              sessionStorage.clear();
              router.push("/");
            }}
            className="text-sm px-3 py-1 border rounded-lg text-gray-300 
              border-gray-600 hover:bg-gray-800 transition"
          >
            End Chat
          </button>
        </div>

        {/* Chat Window */}
        <div
          className="flex-1 min-h-0 overflow-y-auto rounded-xl 
          bg-gray-800/50 border border-gray-700 shadow-inner p-4"
        >
          {messages.length === 0 && (
            <div className="text-gray-500 text-center mt-20">
              No messages yet — ask something about the document.
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`my-3 ${m.role === "user" ? "text-right" : ""}`}
            >
              <div
                className={`inline-block max-w-[80%] p-3 rounded-xl ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                <b className="block text-xs opacity-70 mb-1">
                  {m.role === "user" ? "You" : "AI"}
                </b>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}

          <div ref={scrollRef} />
        </div>

        {/* Input Box */}
        <div className="flex gap-2 mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask a question..."
            className="flex-1 bg-gray-800 text-gray-200 border border-gray-700 
              rounded-lg px-4 py-2 focus:outline-none focus:ring-2 
              focus:ring-blue-600"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 
              rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}
