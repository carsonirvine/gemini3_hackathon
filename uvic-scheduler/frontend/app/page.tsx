"use client";
import { useState } from "react";

export default function Home() {
  const [subject, setSubject] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/courses/${subject}`);
      const result = await res.json();
      
      // Check if result.data exists before setting it
      if (result.status === "success" && result.data) {
        setCourses(result.data); 
      } else {
        setCourses([]); // Fallback to empty array if error
      }
    } catch (error) {
      console.error("Failed to fetch", error);
      setCourses([]); // Fallback to empty array on crash
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-10 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-blue-900">UVic Scheduler AI</h1>
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter Subject (e.g. CSC)" 
            className="border p-2 rounded flex-1 text-black"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 text-white px-6 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Scraping..." : "Find Courses"}
          </button>
        </div>

        {/* Results */}
        <div className="grid gap-4">
          {courses?.map((c: any, i) => (  // Added the '?' here
            <div key={i} className="bg-white p-4 rounded shadow border">
              {/* Use the exact keys your scraper.js returns (e.g., c.title, c.crn) */}
              <h2 className="font-bold text-black">{c.title || "No Title"}</h2>
              <p className="text-gray-600">{c.courseNumber} - {c.section}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}