from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import os
import shutil
from dotenv import load_dotenv
from rag_pipeline import add_document, ask_question, qdrant
from langchain_community.document_loaders import WebBaseLoader
import uuid
from fastapi.middleware.cors import CORSMiddleware
import time
import threading
from qdrant_client.http.models import VectorParams

# -----------------------------
# Load env variables
# -----------------------------
load_dotenv()

# -----------------------------
# Uploads directory
# -----------------------------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -----------------------------
# SESSION ACTIVITY TRACKER
# -----------------------------
# Stores: { session_id: last_activity_timestamp }
SESSION_ACTIVITY = {}

# Timeout for idle auto-delete (in seconds)
IDLE_TIMEOUT = 15 * 60   # 30 mins → You can change for testing

# Collection prefix (so names stay consistent)
COLLECTION_PREFIX = "insightai_"

# -----------------------------
# CLEANUP WORKER THREAD
# -----------------------------
def cleanup_idle_sessions():
    """Deletes Qdrant collections that are idle for too long."""
    while True:
        now = time.time()
        to_delete = []

        for session_id, last_time in SESSION_ACTIVITY.items():
            if now - last_time > IDLE_TIMEOUT:
                to_delete.append(session_id)

        for sid in to_delete:
            collection_name = f"{COLLECTION_PREFIX}{sid}_docs"
            try:
                qdrant.delete_collection(collection_name=collection_name)
                print(f"🧹 Auto-deleted idle collection: {collection_name}")
            except Exception as e:
                print(f"⚠️ Failed to delete {collection_name}: {e}")

            SESSION_ACTIVITY.pop(sid, None)

        time.sleep(30)  # Check every 30 seconds


# Start cleaner thread
threading.Thread(target=cleanup_idle_sessions, daemon=True).start()


# -----------------------------
# FASTAPI INIT + CORS
# -----------------------------
app = FastAPI(title="InsightAI Backend", version="1.0")

FRONTEND_URLS = os.getenv("FRONTEND_URLS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URLS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# -----------------------------
# MODELS
# -----------------------------
class ChatRequest(BaseModel):
    prompt: str
    session_id: str


@app.get("/")
def health_check():
    return {"message": "InsightAI Backend is running 🚀"}


# -----------------------------
# 📌 UPLOAD API
# -----------------------------
@app.post("/upload")
async def upload_source(
    file: UploadFile = File(None),
    url: str = Form(None),
    text: str = Form(None)
):
    """Uploads file/URL/text and creates a new collection."""

    # Generate session
    session_id = str(uuid.uuid4())[:8]
    collection_name = f"{COLLECTION_PREFIX}{session_id}_docs"

    # Track session activity
    SESSION_ACTIVITY[session_id] = time.time()

    print(f"🆕 Creating new collection: {collection_name}")

    # Create Qdrant collection (768 for Gemini embeddings)
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=768, distance="Cosine")
    )

    # ----- CASE 1: FILE -----
    if file:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        num_chunks = add_document(file_path, collection_name)
        os.remove(file_path)

    # ----- CASE 2: URL -----
    elif url:
        loader = WebBaseLoader(url)
        docs = loader.load()

        tmp_path = os.path.join(UPLOAD_DIR, "url.txt")
        with open(tmp_path, "w", encoding="utf-8") as f:
            for doc in docs:
                f.write(doc.page_content + "\n")

        num_chunks = add_document(tmp_path, collection_name)
        os.remove(tmp_path)

    # ----- CASE 3: RAW TEXT -----
    elif text:
        tmp_path = os.path.join(UPLOAD_DIR, "raw.txt")
        with open(tmp_path, "w", encoding="utf-8") as f:
            f.write(text)

        num_chunks = add_document(tmp_path, collection_name)
        os.remove(tmp_path)

    else:
        raise HTTPException(400, "Provide a file, URL, or raw text.")

    return {
        "message": f"Indexed successfully with {num_chunks} chunks.",
        "session_id": session_id,
        "expires_in": "15 minutes of inactivity"
    }


# -----------------------------
# 📌 CHAT API
# -----------------------------
@app.post("/chat")
def chat_with_docs(req: ChatRequest):
    session_id = req.session_id
    collection_name = f"{COLLECTION_PREFIX}{session_id}_docs"

    # Update activity timestamp
    if session_id in SESSION_ACTIVITY:
        SESSION_ACTIVITY[session_id] = time.time()

    # Check collection exists
    collections = qdrant.get_collections().collections
    existing = [c.name for c in collections]

    if collection_name not in existing:
        raise HTTPException(
            status_code=400,
            detail="Session expired. Please upload again."
        )

    # Query
    answer = ask_question(req.prompt, collection_name)
    return {"response": answer}


# -----------------------------
# 📌 MANUAL DELETE (User ends chat)
# -----------------------------
@app.delete("/delete-session")
def delete_session(session_id: str):
    collection_name = f"{COLLECTION_PREFIX}{session_id}_docs"

    try:
        qdrant.delete_collection(collection_name=collection_name)
        print(f"🗑️ Manually deleted: {collection_name}")
    except Exception as e:
        return {"error": f"Failed to delete: {e}"}

    SESSION_ACTIVITY.pop(session_id, None)

    return {"message": f"Session {session_id} deleted."}
