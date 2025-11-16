"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_INSIGHTAI_API_BASE_URL;

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  function isValidUrl(testUrl: string) {
    try {
      const parsed = new URL(testUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function handleUpload() {
    if (!file && !url && !text) {
      toast.error("Please provide a file, URL, or text.");
      return;
    }

    if (file && !allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only PDF, DOCX, and TXT.");
      return;
    }

    if (url && !isValidUrl(url)) {
      toast.error("Invalid URL. Must start with http:// or https://");
      return;
    }

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (url) formData.append("url", url);
    if (text) formData.append("text", text);

    try {
      setLoading(true);

      const res = await axios.post(`${api}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.session_id) {
        sessionStorage.setItem("session_id", res.data.session_id);
        sessionStorage.setItem("source_name", file?.name || url || "Raw Text");

        toast.success("Uploaded! Redirecting...");
        router.push("/chat");
      } else {
        toast.error("Upload failed: no session ID returned.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col h-[calc(var(--real-vh)*100)] overflow-hidden bg-gradient-to-b from-black via-gray-900 to-gray-800">
      <div className="w-full max-w-lg mx-auto flex flex-col flex-1 min-h-0 px-4 py-10">

        <div className="w-full bg-gray-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-800">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white text-center">
            💡 InsightAI
          </h1>
          <p className="text-sm text-gray-400 mb-6 text-center">
            Upload a file, enter a URL, or paste text to start chatting.
          </p>

          <div className="space-y-6">

            <label className="block">
              <span className="text-sm font-medium text-gray-300">Upload file</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  if (selected && !allowedTypes.includes(selected.type)) {
                    toast.error("Only PDF, DOCX, TXT allowed.");
                    e.target.value = "";
                    return;
                  }
                  setFile(selected);
                }}
                className="mt-2 w-full text-gray-200 file:bg-gray-800 file:border-0 file:px-4 file:py-2 
                file:rounded-lg file:text-gray-300 file:hover:bg-gray-700 bg-gray-800 border border-gray-700 rounded-lg p-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-300">Enter a URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="mt-2 w-full bg-gray-800 text-gray-200 border border-gray-700 p-3 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-300">Paste raw text</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text here..."
                className="mt-2 w-full bg-gray-800 text-gray-200 border border-gray-700 p-3 rounded-lg 
                h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg 
                font-medium transition disabled:opacity-50 text-center"
              >
                {loading ? "Uploading..." : "Upload & Chat"}
              </button>

              <p className="text-xs text-gray-500 text-center sm:text-left">
                Sessions expire after 15 minutes of inactivity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
