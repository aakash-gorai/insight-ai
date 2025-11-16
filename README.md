# 🧠 InsightAI  
> **Chat with your Documents and Webpages using AI**

InsightAI is an **AI-powered RAG application** that lets users upload **PDF/DOCX/TXT files**, input **URLs**, or paste **raw text**, and then **chat intelligently** with the extracted content.  
It uses **FastAPI**, **LangChain**, **Qdrant**, and **Next.js** to deliver a fast, scalable chat experience.

---

## 🚀 Features

- ✅ Upload **PDF / DOCX / TXT**
- ✅ Add **web URLs** and extract webpage content
- ✅ Paste **raw text**
- ✅ Chat with the content using **RAG (Retrieval-Augmented Generation)**
- ✅ Temporary session-based vector DB storage (auto-cleans)
- ✅ Multi-user support via session-based collections
- ✅ Auto-delete inactive collections (idle cleanup)
- ✅ Fully responsive **Next.js UI** with dark theme

---

## 🧩 Tech Stack

| Layer | Tools |
|-------|-------|
| **Frontend** | Next.js (App Router), Axios, Tailwind CSS |
| **Backend** | FastAPI, Python 3.13 |
| **AI / LLM** | Google Gemini |
| **Embeddings** | GoogleGenerativeAIEmbeddings |
| **Vector DB** | Qdrant Cloud |
| **Document Parsing** | PyPDFLoader, Unstructured, TextLoader |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

# 📦 Project Structure

```
insight-ai/
│── backend/
│   ├── main.py
│   ├── rag_pipeline.py
│   ├── requirements.txt
│   └── uploads/
│
│── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── chat/page.tsx
│   ├── components/
│   ├── styles/
│   └── package.json
```

---

# ⚙️ Backend Setup

### **1️⃣ Create virtual environment**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

---

### **2️⃣ Install dependencies**
```bash
pip install -r requirements.txt
```

---

### **3️⃣ Create `.env` file**
```
QDRANT_URL=https://xxxx.qdrant.cloud
QDRANT_API_KEY=xxxxx
GOOGLE_API_KEY=xxxxxxxx
FRONTEND_URLS=https://xxx.xxx,https://xxx.xxx
```

---

### **4️⃣ Start Backend**
```bash
uvicorn main:app --reload --port 8000
```

Backend will run at:
```
http://127.0.0.1:8000
```

---

# 🖥️ Frontend Setup (Next.js)

### **1️⃣ Install dependencies**
```bash
cd frontend
npm install
```

---

### **2️⃣ Run Dev Server**
```bash
npm run dev
```

Frontend runs at:
```
http://localhost:3000
```

---

# 🔌 API Endpoints

### **POST /upload**
Upload **file / URL / raw text**

**Response**
```json
{
  "message": "Indexed successfully with 12 chunks.",
  "session_id": "a19fdc3b",
  "expires_in": "1 hour"
}
```

---

### **POST /chat**
Send question based on uploaded content.

**Body**
```json
{
  "session_id": "a19fdc3b",
  "prompt": "Summarize the document"
}
```

---

### **DELETE /delete-session?session_id=xxxx**
Manually delete session collection.

---

# 🧠 How RAG Works in InsightAI

1. User uploads file / URL / text  
2. Backend extracts text (PyPDFLoader, Unstructured, TextLoader)  
3. LangChain splits content into chunks  
4. Embeddings created via Sentence-Transformers  
5. Stored in Qdrant under a **temporary session-specific collection**  
6. Chat queries retrieve relevant chunks + Gemini generates contextual answers  
7. Session auto-expires and is deleted after idle timeout  

---

# 🧹 Auto Cleanup (Idle Collection Deletion)

The backend tracks last activity of each session:  
- If **no requests for X minutes**, the session is automatically deleted  
- Frontend also calls `/delete-session` when closing tab  

This ensures **no storage bloat**.

---

# 🚀 Deployment

### **Frontend Deployment**
Deploy on **Vercel**

```
npm run build
vercel deploy
```

### **Backend Deployment**
Deploy on **Render**

Ensure CORS settings allow:
```
https://your-frontend-domain.com
```

---

# 🎯 TODO / Improvements

- [ ] Support multiple files per session  
- [ ] Session history persistence  
- [ ] Multi-LLM support selector  
- [ ] Streaming AI responses  
- [ ] Add source citations in answers  

---

# ⭐ Final Notes

InsightAI is designed to be:
- Simple  
- Fast  
- Secure  
- Scalable  

If you want enhancements (UI redesign, streaming chat, multi-file upload, cloud deployment setup), just ask!
