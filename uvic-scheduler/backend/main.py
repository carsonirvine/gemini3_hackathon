from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scraper import get_uvic_courses

app = FastAPI()

# Updated CORS to be more robust for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# New Route: Accepts both subject (CSC) and number (111)
@app.get("/api/courses/{subject}/{number}")
def get_courses(subject: str, number: str):
    print(f"🔍 API Request: Searching for {subject.upper()} {number}")
    try:
        # We pass both arguments to your scraper logic
        data = get_uvic_courses(subject.upper(), number)
        
        return {
            "status": "success", 
            "subject": subject.upper(),
            "number": number,
            "data": data
        }
    except Exception as e:
        print(f"❌ API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraper failed: {str(e)}")