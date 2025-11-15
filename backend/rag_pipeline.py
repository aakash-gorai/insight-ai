import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    UnstructuredWordDocumentLoader,
)
import chardet
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

load_dotenv()

# --------------------------
# Qdrant Client
# --------------------------
qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

COLLECTION_PREFIX = "insightai_"


# --------------------------
# Models
# --------------------------
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash", temperature=0.2)

# Gemini embeddings have fixed dimension of 768
EMBED_DIM = 768


# --------------------------
# Create New Collection
# --------------------------
def create_new_collection(collection_name: str):
    print(f"⚙️ Creating new Qdrant collection: {collection_name}")

    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=rest.VectorParams(
            size=EMBED_DIM,
            distance=rest.Distance.COSINE,
        ),
    )


# --------------------------
# Delete Collection
# --------------------------
def delete_collection(collection_name: str):
    try:
        qdrant.delete_collection(collection_name)
        print(f"🗑️ Deleted collection: {collection_name}")
    except:
        print(f"⚠️ Failed to delete collection: {collection_name}")


# --------------------------
# Add Document
# --------------------------
def add_document(filepath: str, collection_name: str):
    ext = os.path.splitext(filepath)[1].lower()

    # Smart loader
    if ext == ".pdf":
        loader = PyPDFLoader(filepath)
    elif ext in (".docx", ".doc"):
        loader = UnstructuredWordDocumentLoader(filepath)
    else:
        with open(filepath, "rb") as f:
            raw = f.read()
            encoding = chardet.detect(raw)["encoding"] or "utf-8"
        loader = TextLoader(filepath, encoding=encoding)

    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_documents(docs)

    vectorstore = QdrantVectorStore(
        client=qdrant,
        collection_name=collection_name,
        embedding=embeddings,
    )

    vectorstore.add_documents(chunks)

    print(f"✅ {len(chunks)} chunks added → {collection_name}")
    return len(chunks)


# --------------------------
# Ask Question
# --------------------------
def ask_question(query: str, collection_name: str):
    vectorstore = QdrantVectorStore(
        client=qdrant,
        collection_name=collection_name,
        embedding=embeddings,
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

    return qa_chain.run(query)
