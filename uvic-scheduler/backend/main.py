from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any
from scraper import get_uvic_courses
from schedule_builder import get_best_schedules

app = FastAPI()

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

# --- NEW: Pydantic model to handle the incoming JSON ---
class BuildRequest(BaseModel):
    mandatory: Dict[str, List[Any]]
    electives: Dict[str, List[Any]]
    target_count: int  # This ensures the backend captures the user's desired load

@app.get("/api/courses/{subject}/{number}")
def get_courses(subject: str, number: str):
    print(f"API Request: Searching for {subject.upper()} {number}")
    try:
        data = get_uvic_courses(subject.upper(), number)
        return {
            "status": "success", 
            "subject": subject.upper(),
            "number": number,
            "data": data
        }
    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scraper failed: {str(e)}")
    
@app.post("/api/build-schedules")
async def build(payload: BuildRequest):
    # Prepare the dictionary format the builder expects internally
    course_data = {
        "mandatory": payload.mandatory,
        "electives": payload.electives
    }
    
    # Pass BOTH the data and the target_count to fix the TypeError
    schedules = get_best_schedules(course_data, payload.target_count)
    
    return {"count": len(schedules), "schedules": schedules}