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

  async function handleUpload() {
    if (!file && !url && !text) {
      toast.error("Please provide a file, URL, or text.");
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
        toast.success("Uploaded! Redirecting to chat...");
        router.push("/chat");
      } else {
        toast.error("Upload failed: no session id returned.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen 
      bg-gradient-to-br from-black via-gray-900 to-gray-800 p-6"
    >
      <div
        className="w-full max-w-2xl bg-gray-900/70 backdrop-blur-md 
        p-8 rounded-2xl shadow-xl border border-gray-700"
      >
        <h1 className="text-4xl font-bold mb-2 text-white">💡 InsightAI</h1>
        <p className="text-sm text-gray-400 mb-8">
          Upload a file, add a webpage URL, or paste text to start chatting.
        </p>

        <div className="space-y-6">
          {/* File Upload */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300">
              Upload file (PDF / DOCX / TXT)
            </span>

            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-gray-200
                file:bg-gray-800 file:border-0 file:px-4 file:py-2 
                file:rounded file:text-gray-300 file:hover:bg-gray-700"
            />
          </label>

          {/* URL Input */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300">
              Or enter a URL
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="mt-2 w-full bg-gray-800 text-gray-200 border border-gray-700 
                p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {/* Text Input */}
          <label className="block">
            <span className="text-sm font-medium text-gray-300">
              Or paste raw text
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste text here..."
              className="mt-2 w-full bg-gray-800 text-gray-200 border border-gray-700 
                p-3 rounded-lg h-32 resize-none 
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div className="flex items-center justify-between gap-4 pt-4">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white 
                py-2 px-6 rounded-lg font-medium transition
                disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload & Chat"}
            </button>

            <p className="text-xs text-gray-500">
              Session expired about 15 mins of inactivity.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
