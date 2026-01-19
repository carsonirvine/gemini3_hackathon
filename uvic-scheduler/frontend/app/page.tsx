"use client";
import { useState } from "react";

interface CourseSection {
  subject: string;
  course: string;
  title?: string;
  section: string;
  crn: string;
  schedule: string;
  seats: string;
  waitlist: string;
}

interface ScheduleCombination {
  status: 'open' | 'waitlist';
  sections: CourseSection[];
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
  const [generatedSchedules, setGeneratedSchedules] = useState<ScheduleCombination[]>([]);
  
  const colorPalette = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-orange-500', 'bg-indigo-600', 'bg-cyan-600'];

  const getEventStyle = (timeStr: string) => {
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const matches = [...timeStr.matchAll(timeRegex)];
    if (matches.length < 2) return null;

    const parseToMinutes = (match: RegExpMatchArray) => {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const start = parseToMinutes(matches[0]);
    const end = parseToMinutes(matches[1]);
    
    const calendarStart = 8 * 60; // 8:00 AM
    const totalMinutes = 13 * 60; // Until 9:00 PM

    return {
      top: `${Math.max(0, ((start - calendarStart) / totalMinutes) * 100)}%`,
      height: `${((end - start) / totalMinutes) * 100}%`,
    };
  };

  const getStatusColor = (rawStr: string, isWaitlist: boolean) => {
    if (!rawStr || rawStr === "N/A" || !rawStr.includes('/')) return "bg-gray-100 text-gray-500";
    try {
      const [avail, total] = rawStr.split('/').map(Number);
      if (avail <= 0) return "bg-red-50 text-red-600 border-red-100"; 
      const percentLeft = (avail / total) * 100;
      if (isWaitlist && avail < total) return "bg-yellow-50 text-yellow-600 border-yellow-100";
      if (!isWaitlist && percentLeft < 15) return "bg-yellow-50 text-yellow-600 border-yellow-100";
      return "bg-green-50 text-green-600 border-green-100"; 
    } catch { return "bg-gray-100 text-gray-500"; }
  };

  const addRow = (type: 'mandatory' | 'elective') => setRows([...rows, { id: Date.now(), subject: "", number: "", type }]);
  const removeRow = (id: number) => setRows(rows.filter(row => row.id !== id));
  
  const updateRow = (id: number, field: 'subject' | 'number', value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const renderDayVisualizer = (scheduleStr: string, colorClass: string) => {
    const cleanStr = (scheduleStr || "").toLowerCase();
    const dayPart = cleanStr.split('|')[0];
    const daysMap = [
        { label: 'M', search: 'monday' }, { label: 'T', search: 'tuesday' }, 
        { label: 'W', search: 'wednesday' }, { label: 'R', search: 'thursday' }, 
        { label: 'F', search: 'friday' }
    ];
    return daysMap.map((day, idx) => (
      <div key={idx} className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black transition-all ${dayPart.includes(day.search) ? `${colorClass} text-white shadow-sm` : 'bg-gray-100 text-gray-300'}`}>
        {day.label}
      </div>
    ));
  };

  const startScrapeAndBuild = async () => {
    setLoading(true);
    setStatusMessage({ text: "Gathering course data concurrently...", type: 'info' });
    const activeRows = rows.filter(r => r.subject && r.number);
    try {
      const fetchPromises = activeRows.map(async (row) => {
        const res = await fetch(`http://127.0.0.1:8000/api/courses/${row.subject.toUpperCase()}/${row.number}`);
        const result = await res.json();
        return { key: `${row.subject.toUpperCase()}${row.number}`, data: result.data || [] };
      });
      const results = await Promise.all(fetchPromises);
      const scraperData: Record<string, CourseSection[]> = {};
      results.forEach(item => { scraperData[item.key] = item.data; });

      const buildRes = await fetch(`http://127.0.0.1:8000/api/build-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandatory: scraperData })
      });

      const buildResult = await buildRes.json();
      setGeneratedSchedules(buildResult.schedules || []);
      setStatusMessage({ text: buildResult.schedules?.length > 0 ? `✅ Success! ${buildResult.schedules.length} Schedules Generated` : "❌ No valid schedules found.", type: buildResult.schedules?.length > 0 ? 'success' : 'error' });
    } catch (error) { setStatusMessage({ text: "Connection error.", type: 'error' }); }
    setLoading(false);
  };

  return (
    <main className="bg-gray-50 min-h-screen flex flex-col items-center py-12 px-4 text-gray-900 antialiased">
      <div className="w-full max-w-lg bg-white shadow-2xl shadow-gray-200/50 rounded-3xl p-6 mb-8 border border-gray-100">
        <h1 className="text-3xl font-black text-center mb-6 tracking-tight">UVic Builder</h1>
        
        {currentPage === 1 ? (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Mandatory Courses</p>
            {rows.filter(r => r.type === 'mandatory').map((row) => (
              <div key={row.id} className="flex gap-2 group">
                <input className="w-24 p-3 border-2 border-gray-100 rounded-xl uppercase font-bold focus:border-blue-500 outline-none transition-all" placeholder="CSC" value={row.subject} onChange={e => updateRow(row.id, 'subject', e.target.value)} />
                <input className="flex-1 p-3 border-2 border-gray-100 rounded-xl font-bold focus:border-blue-500 outline-none transition-all" placeholder="111" value={row.number} onChange={e => updateRow(row.id, 'number', e.target.value)} />
                {rows.filter(r => r.type === 'mandatory').length > 1 && (
                  <button onClick={() => removeRow(row.id)} className="text-gray-300 hover:text-red-500 transition-colors px-1 text-xl font-bold">×</button>
                )}
              </div>
            ))}
            <button onClick={() => addRow('mandatory')} className="text-blue-600 text-xs font-black hover:underline px-1">+ ADD ANOTHER COURSE</button>
            <button onClick={() => setCurrentPage(2)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 mt-4">Next Step</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Elective Options</p>
            {rows.filter(r => r.type === 'elective').map(row => (
              <div key={row.id} className="flex gap-2">
                <input className="w-24 p-3 border-2 border-gray-100 rounded-xl uppercase font-bold focus:border-emerald-500 outline-none transition-all" placeholder="ENGR" value={row.subject} onChange={e => updateRow(row.id, 'subject', e.target.value)} />
                <input className="flex-1 p-3 border-2 border-gray-100 rounded-xl font-bold focus:border-emerald-500 outline-none transition-all" placeholder="110" value={row.number} onChange={e => updateRow(row.id, 'number', e.target.value)} />
                <button onClick={() => removeRow(row.id)} className="text-gray-300 hover:text-red-500 transition-colors px-1 text-xl font-bold">×</button>
              </div>
            ))}
            <button onClick={() => addRow('elective')} className="text-emerald-600 text-xs font-black hover:underline px-1">+ ADD ELECTIVE OPTION</button>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setCurrentPage(1)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-bold">Back</button>
              <button onClick={startScrapeAndBuild} disabled={loading} className="flex-[2] bg-black text-white py-4 rounded-2xl font-black shadow-lg shadow-gray-200">
                {loading ? "Processing..." : "Generate Schedules"}
              </button>
            </div>
          </div>
        )}
        {statusMessage && <div className={`mt-4 p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest ${statusMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{statusMessage.text}</div>}
      </div>

      <div className="w-full max-w-4xl space-y-16">
        {generatedSchedules.map((schedule, schedIdx) => (
          <div key={schedIdx} className="bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-200/40 border border-white">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <span className="bg-gray-900 text-white w-8 h-8 flex items-center justify-center rounded-full text-xs font-black">{schedIdx + 1}</span>
                    <h3 className="font-black text-xl tracking-tight text-gray-800">Schedule Option</h3>
                </div>
                <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-full border tracking-wider ${schedule.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{schedule.status}</span>
            </div>

            {/* VISUAL CALENDAR GRID */}
            <div className="mb-10 bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                <div className="flex mb-4">
                    <div className="w-12"></div>
                    {['MON', 'TUE', 'WED', 'THU', 'FRI'].map(day => (
                        <div key={day} className="flex-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
                    ))}
                </div>
                <div className="relative h-80 flex gap-2">
                    <div className="w-12 flex flex-col justify-between text-[9px] font-black text-gray-300 py-1">
                        <span>8 AM</span><span>11 AM</span><span>2 PM</span><span>5 PM</span><span>8 PM</span>
                    </div>
                    <div className="flex-1 flex gap-2 relative border-l border-gray-200">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((dayName) => (
                            <div key={dayName} className="flex-1 relative bg-white/40 rounded-xl border border-dashed border-gray-100">
                                {schedule.sections.map((section, secIdx) => {
                                    if (!section.schedule.toLowerCase().includes(dayName)) return null;
                                    const style = getEventStyle(section.schedule);
                                    if (!style) return null;
                                    return (
                                        <div key={`${secIdx}-${dayName}`} 
                                             className={`absolute w-[94%] left-[3%] rounded-lg border-l-4 border-white/30 shadow-sm overflow-hidden flex items-center justify-center ${colorPalette[secIdx % colorPalette.length]}`}
                                             style={{ top: style.top, height: style.height }}>
                                            <div className="p-1 text-center">
                                                <p className="text-[7px] font-black text-white uppercase leading-none tracking-tighter">
                                                    {section.subject} {section.course}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedule.sections.map((section, secIdx) => {
                const timeRegex = /\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/g;
                const foundTimes = section.schedule.match(timeRegex);
                let timeDisplay = foundTimes && foundTimes.length >= 2 ? `${foundTimes[0]} - ${foundTimes[1]}` : (section.schedule.includes('|') ? section.schedule.split('|')[1].trim() : "TBA");

                return (
                <div key={secIdx} className="relative p-5 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="pr-2">
                            <h4 className="font-black text-md leading-tight mb-1 text-gray-900">{section.subject} {section.course}</h4>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sec {section.section}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                            <div className={`text-[8px] font-black px-2 py-0.5 rounded-md border shadow-sm ${getStatusColor(section.seats, false)}`}>Seats: {section.seats}</div>
                            <div className={`text-[8px] font-black px-2 py-0.5 rounded-md border shadow-sm ${getStatusColor(section.waitlist, true)}`}>Wait: {section.waitlist}</div>
                        </div>
                    </div>
                    <div className="flex gap-1.5 mb-4">{renderDayVisualizer(section.schedule, colorPalette[secIdx % colorPalette.length])}</div>
                    <div className="text-[11px] font-extrabold text-gray-600 bg-white border border-gray-100 py-2 rounded-xl shadow-inner text-center group-hover:border-gray-200 transition-colors">{timeDisplay}</div>
                </div>
                );
                })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}