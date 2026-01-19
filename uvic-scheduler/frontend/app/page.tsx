"use client";
import { useState } from "react";

interface Course {
  subject: string;
  course: string;
  title?: string;
  section: string;
  crn: string;
  schedule: string;
  seats: string;
  waitlist: string;
}

interface CourseRow {
  id: number;
  subject: string;
  number: string;
  type: 'mandatory' | 'elective';
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
  const [rows, setRows] = useState<CourseRow[]>([{ id: Date.now(), subject: "", number: "", type: 'mandatory' }]);
  const [allSchedules, setAllSchedules] = useState<Course[][]>([]);
  
  const colorPalette = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-orange-500', 'bg-indigo-600', 'bg-cyan-600'];

  const addRow = (type: 'mandatory' | 'elective') => setRows([...rows, { id: Date.now(), subject: "", number: "", type }]);
  const removeRow = (id: number) => setRows(rows.filter(row => row.id !== id));
  const updateRow = (id: number, field: 'subject' | 'number', value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const renderDayVisualizer = (scheduleStr: string, colorClass: string) => {
    const dayPart = scheduleStr.split('|')[0].toLowerCase();
    const activeDays = dayPart.split(',').map(d => d.trim());
    const daysMap = [{ l: 'M', m: 'monday' }, { l: 'T', m: 'tuesday' }, { l: 'W', m: 'wednesday' }, { l: 'R', m: 'thursday' }, { l: 'F', m: 'friday' }];

    return daysMap.map((day, idx) => (
      <div key={idx} className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black ${activeDays.includes(day.m) ? `${colorClass} text-white shadow-sm` : 'bg-gray-100 text-gray-300'}`}>
        {day.l}
      </div>
    ));
  };

  const startScrape = async () => {
    setLoading(true);
    setStatusMessage({ text: "Scraping all sections...", type: 'info' });
    const activeRows = rows.filter(r => r.subject && r.number);
    
    try {
      const scrapeResults = await Promise.all(activeRows.map(async (row) => {
        const res = await fetch(`http://127.0.0.1:8000/api/courses/${row.subject.toUpperCase()}/${row.number}`);
        const result = await res.json();
        return result.data || [];
      }));

      // FIX: Flatten the array to show ALL sections, not just index [0]
      const flattenedData = scrapeResults.flat();
      
      if (flattenedData.length > 0) {
        setAllSchedules([flattenedData]); 
        setStatusMessage({ text: `✅ Found ${flattenedData.length} sections total.`, type: 'success' });
      } else {
        setStatusMessage({ text: "❌ No sections found.", type: 'error' });
      }
    } catch (error) {
      setStatusMessage({ text: "Connection error.", type: 'error' });
    }
    setLoading(false);
  };

  return (
    <main className="bg-gray-100 min-h-screen flex flex-col items-center py-12 px-4 text-gray-900">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-3xl p-6 sm:p-8 mb-8">
        <h1 className="text-3xl font-extrabold text-center mb-6">UVic Builder</h1>
        
        {currentPage === 1 ? (
          <div className="space-y-4">
            {rows.filter(r => r.type === 'mandatory').map((row, i) => (
              <div key={row.id} className="flex gap-2">
                <input className="w-20 p-3 border-2 rounded-xl uppercase" placeholder="Subj" value={row.subject} onChange={e => updateRow(row.id, 'subject', e.target.value)} />
                <input className="flex-1 p-3 border-2 rounded-xl" placeholder="Course #" value={row.number} onChange={e => updateRow(row.id, 'number', e.target.value)} />
                {i !== 0 && <button onClick={() => removeRow(row.id)} className="text-red-400 px-2">×</button>}
              </div>
            ))}
            <button onClick={() => addRow('mandatory')} className="text-blue-600 text-sm font-bold">+ Add Course</button>
            <button onClick={() => setCurrentPage(2)} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Next</button>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.filter(r => r.type === 'elective').map(row => (
              <div key={row.id} className="flex gap-2">
                <input className="w-20 p-3 border-2 rounded-xl uppercase" placeholder="Subj" value={row.subject} onChange={e => updateRow(row.id, 'subject', e.target.value)} />
                <input className="flex-1 p-3 border-2 rounded-xl" placeholder="Course #" value={row.number} onChange={e => updateRow(row.id, 'number', e.target.value)} />
                <button onClick={() => removeRow(row.id)} className="text-red-400 px-2">×</button>
              </div>
            ))}
            <button onClick={() => addRow('elective')} className="text-emerald-600 text-sm font-bold">+ Add Elective</button>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(1)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-bold">Back</button>
              <button onClick={startScrape} disabled={loading} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50">
                {loading ? "Scraping..." : "Find Sections"}
              </button>
            </div>
          </div>
        )}

        {statusMessage && <div className={`mt-4 p-3 rounded-xl text-center text-sm font-bold ${statusMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{statusMessage.text}</div>}
      </div>

      <div className="w-full max-w-lg space-y-4">
        {allSchedules[0]?.map((course, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-xl">{course.subject} {course.course}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Sec {course.section} • CRN {course.crn}</p>
              </div>
              <div className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100">{course.seats} Seats</div>
            </div>
            <div className="flex gap-2">{renderDayVisualizer(course.schedule, colorPalette[i % colorPalette.length])}</div>
            <p className="mt-2 text-[11px] font-bold text-gray-500">{course.schedule.split('|')[1]}</p>
          </div>
        ))}
      </div>
    </main>
  );
}