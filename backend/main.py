from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv


#load env variables from .env file
load_dotenv()  
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# FastAPI app
app = FastAPI(title="InsightAI Backend", version="1.0")

# Request model
class PromptRequest(BaseModel):
    prompt: str

# Routes
@app.get("/")
def root():
    return {"message": "InsightAI Backend is running 🚀"}

@app.post("/generate")
def generate_text(req: PromptRequest):
    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(req.prompt)
    return {"response": response.text}