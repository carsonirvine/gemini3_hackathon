# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scraper import get_uvic_courses  # <--- Import your function

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/courses/{subject}")
def get_courses(subject: str):
    print(f"Received request for: {subject}")
    try:
        # Call your logic
        data = get_uvic_courses(subject)
        return {"status": "success", "data": data}
    except Exception as e:
        # Send error back to frontend
        raise HTTPException(status_code=500, detail=str(e))