"use client";
import { useState, useMemo, useEffect } from "react";

interface CourseSection {
  subject: string;
  course: string;
  section: string;
  crn: string;
  schedule: string;
  seats: string;
  waitlist: string;
}

interface ScheduleCombination {
  status: 'open' | 'waitlist' | 'full';
  sections: CourseSection[];
  included_electives: string[];
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
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  
  // --- NEW: TARGET COUNT STATE ---
  const [targetCount, setTargetCount] = useState(5);

  const colorPalette = [
    'bg-blue-600 border-blue-400',
    'bg-indigo-600 border-indigo-400',
    'bg-violet-600 border-violet-400',
    'bg-emerald-600 border-emerald-400',
    'bg-rose-600 border-rose-400',
    'bg-amber-600 border-amber-400'
  ];

  // --- CAPACITY LOGIC ---
  const MAX_TOTAL = 6;
  const MAX_MANDATORY = 6;
  const MAX_ELECTIVE = 5; // Increased slightly so users can list many options

  const mandatoryCount = rows.filter(r => r.type === 'mandatory').length;
  const electiveCount = rows.filter(r => r.type === 'elective').length;
  const totalInputs = rows.length;

  // Logic: Can add if type limit isn't reached AND total limit isn't reached
  // We allow inputting MORE than the target (e.g. input 8 courses, choose best 5)
  const canAddMandatory = mandatoryCount < MAX_MANDATORY;
  const canAddElective = electiveCount < MAX_ELECTIVE;

  // --- NEW: Safety Effect ---
  // Ensure targetCount is always valid based on current inputs
  useEffect(() => {
    // Min: You must take at least your mandatory courses
    // Max: You can't take more courses than you've inputted (capped at 6)
    const maxPossible = Math.min(totalInputs, 6);
    const minPossible = Math.max(mandatoryCount, 1);
    
    if (targetCount < minPossible) setTargetCount(minPossible);
    if (targetCount > maxPossible && maxPossible > 0) setTargetCount(maxPossible);
  }, [mandatoryCount, totalInputs, targetCount]);

  const filteredSchedules = useMemo(() => {
    if (selectedElectives.length === 0) {
      // Show everything if no specific filter is clicked
      return generatedSchedules;
    }
    return generatedSchedules.filter(sched => {
      const schedElectives = sched.included_electives || [];
      return selectedElectives.every(selected => schedElectives.includes(selected));
    });
  }, [generatedSchedules, selectedElectives]);

  const conflicts = useMemo(() => {
    if (generatedSchedules.length === 0) return [];
    const electiveRows = rows.filter(r => r.type === 'elective' && r.subject);
    const availableInResults = new Set(generatedSchedules.flatMap(s => s.included_electives));
    return electiveRows
      .map(r => `${r.subject.toUpperCase()}${r.number}`)
      .filter(name => !availableInResults.has(name));
  }, [generatedSchedules, rows]);

  const getEventStyle = (timeStr: string) => {
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const matches = [...timeStr.matchAll(timeRegex)];
    if (matches.length < 2) return null;
    const parseToMins = (m: RegExpMatchArray) => {
      let h = parseInt(m[1]);
      if (m[3].toUpperCase() === "PM" && h < 12) h += 12;
      if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
      return h * 60 + parseInt(m[2]);
    };
    const start = parseToMins(matches[0]);
    const end = parseToMins(matches[1]);
    return { top: `${((start - 480) / 780) * 100}%`, height: `${((end - start) / 780) * 100}%` };
  };

  const updateRow = (id: number, field: 'subject' | 'number', val: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const removeRow = (id: number) => setRows(rows.filter(r => r.id !== id));

  const startBuild = async () => {
    setLoading(true);
    setStatusMessage({ text: "Scraping & Building...", type: 'info' });

    const startTime = performance.now(); // <--- START TIMER

    try {
      const active = rows.filter(r => r.subject && r.number);
      
      // 1. Scrape Data
      const results = await Promise.all(active.map(async (r) => {
        const res = await fetch(`http://127.0.0.1:8000/api/courses/${r.subject.toUpperCase()}/${r.number}`);
        const json = await res.json();
        return { key: `${r.subject.toUpperCase()}${r.number}`, data: json.data || [], type: r.type };
      }));

      // 2. Prepare Payload
      const payload = { mandatory: {} as any, electives: {} as any, target_count: targetCount };
      
      results.forEach(item => { 
        payload[item.type === 'mandatory' ? 'mandatory' : 'electives'][item.key] = item.data; 
      });

      // 3. Send to Builder
      const buildRes = await fetch(`http://127.0.0.1:8000/api/build-schedules`, { // Ensure this matches your endpoint in main.py
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const buildJson = await buildRes.json();
      setGeneratedSchedules(buildJson.schedules || []);
      setSelectedElectives([]); 

      const endTime = performance.now(); // <--- END TIMER
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      console.log("Program took " + Number(duration.toFixed(2)) + " seconds");

      setStatusMessage({ text: `Found ${buildJson.schedules?.length || 0} valid schedules`, type: 'success' });
    } catch { setStatusMessage({ text: "Backend Error", type: 'error' }); }
    setLoading(false);
  };

  return (
    <main className="bg-[#f0f4f8] min-h-screen p-6 md:p-12 flex flex-col items-center font-sans text-slate-900 overflow-x-hidden">
      
      {/* INPUT MASTER TILE */}
      <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-2000/40 border border-white mb-12 transform transition-all">
        <h1 className="text-4xl font-black text-center mb-6 tracking-tighter text-slate-800">UVIC SCHEDULE <span className="text-blue-600">BUILDER</span></h1>
        
        {/* --- CAPACITY TRACKER BAR --- */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            <span>Input List Size</span>
            <span>{totalInputs} Items Listed</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {/* Blue Segment for Mandatory */}
            <div 
              className="h-full bg-blue-500 transition-all duration-500" 
              style={{ width: `${(mandatoryCount / (mandatoryCount + electiveCount || 1)) * 100}%` }}
            ></div>
            {/* Green Segment for Electives */}
            <div 
              className="h-full bg-emerald-400 transition-all duration-500" 
              style={{ width: `${(electiveCount / (mandatoryCount + electiveCount || 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {currentPage === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-2">Step 1: Mandatory</h2>
            {rows.filter(r => r.type === 'mandatory').map((r, i, arr) => (
              <div key={r.id} className="flex gap-3 items-center group">
                <input className="w-24 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all duration-200" placeholder="Subj" value={r.subject} onChange={e => updateRow(r.id, 'subject', e.target.value)} />
                <input className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-blue-500 focus:bg-white outline-none transition-all duration-200" placeholder="Course Number" value={r.number} onChange={e => updateRow(r.id, 'number', e.target.value)} />
                {arr.length > 1 && (
                  <button onClick={() => removeRow(r.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 font-bold">✕</button>
                )}
              </div>
            ))}
            
            <button 
              onClick={() => canAddMandatory && setRows([...rows, { id: Date.now(), subject: "", number: "", type: 'mandatory' }])} 
              disabled={!canAddMandatory}
              className={`flex items-center gap-2 font-black text-[10px] tracking-widest uppercase transition-all ${
                canAddMandatory 
                  ? 'text-blue-600 hover:text-blue-700 hover:translate-x-1' 
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span className="text-xl">+</span> 
              {mandatoryCount >= MAX_MANDATORY ? "Mandatory Limit Reached" : "Add Course"}
            </button>

            <button onClick={() => setCurrentPage(2)} 
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black shadow-lg hover:bg-blue-600 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300">
              Continue to Electives
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Step 2: Electives</h2>
            {rows.filter(r => r.type === 'elective').map((r, i, arr) => (
              <div key={r.id} className="flex gap-3 items-center group">
                <input className="w-24 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold uppercase focus:border-emerald-500 focus:bg-white outline-none transition-all duration-200" placeholder="Subj" value={r.subject} onChange={e => updateRow(r.id, 'subject', e.target.value)} />
                <input className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 focus:bg-white outline-none transition-all duration-200" placeholder="Course Number" value={r.number} onChange={e => updateRow(r.id, 'number', e.target.value)} />
                <button onClick={() => removeRow(r.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 font-bold">✕</button>
              </div>
            ))}

            <button 
              onClick={() => canAddElective && setRows([...rows, { id: Date.now(), subject: "", number: "", type: 'elective' }])} 
              disabled={!canAddElective}
              className={`flex items-center gap-2 font-black text-[10px] tracking-widest uppercase transition-all ${
                canAddElective 
                  ? 'text-emerald-600 hover:text-emerald-700 hover:translate-x-1' 
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span className="text-xl">+</span> 
              {electiveCount >= MAX_ELECTIVE ? "Elective Limit Reached" : "Add Elective Option"}
            </button>
            
            <hr className="border-slate-100 my-6"/>

            {/* --- NEW: TARGET COUNT SELECTOR --- */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Target Schedule Size</span>
                <span className="text-[10px] font-bold text-slate-400">Total Courses to Take</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-between px-2">
                  <button 
                    onClick={() => setTargetCount(Math.max(mandatoryCount, targetCount - 1))}
                    disabled={targetCount <= Math.max(mandatoryCount, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 font-bold disabled:opacity-30"
                  >-</button>
                  <span className="text-2xl font-black text-slate-800">{targetCount}</span>
                  <button 
                     onClick={() => setTargetCount(Math.min(Math.min(totalInputs, MAX_TOTAL), targetCount + 1))}
                     disabled={targetCount >= Math.min(totalInputs, MAX_TOTAL)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 font-bold disabled:opacity-30"
                  >+</button>
                </div>
                <div className="text-[10px] font-bold text-slate-400 text-right leading-tight">
                  <span className="text-blue-500">{mandatoryCount} Mandatory</span><br/>
                  <span className="text-emerald-500">+{targetCount - mandatoryCount} Electives</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setCurrentPage(1)} 
                className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-3xl font-black hover:bg-slate-200 transition-all duration-300">
                Back
              </button>
              <button onClick={startBuild} disabled={loading} 
                className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-lg hover:bg-emerald-500 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 disabled:opacity-50">
                {loading ? "Crunching..." : `Build ${targetCount}-Course Schedules`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFLICT INDICATOR */}
      {conflicts.length > 0 && (
        <div className="w-full max-w-4xl mb-6 p-5 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center gap-4 text-amber-700">
          <span className="text-xl">⚠️</span>
          <p className="text-[11px] font-bold uppercase tracking-wider">
             Note: <span className="underline decoration-2">{conflicts.join(", ")}</span> didn't fit in any combination.
          </p>
        </div>
      )}

      {/* RESULT FILTERS */}
      {generatedSchedules.length > 0 && (
        <div className="w-full max-w-4xl mb-12 flex flex-wrap gap-2 justify-center">
          <button onClick={() => setSelectedElectives([])} 
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${selectedElectives.length === 0 ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
            Show All
          </button>
          {Array.from(new Set(generatedSchedules.flatMap(s => s.included_electives))).sort().map(key => {
            const active = selectedElectives.includes(key);
            return (
              <button key={key} onClick={() => setSelectedElectives(prev => active ? prev.filter(x => x !== key) : [...prev, key])} 
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${active ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'}`}>
                {active ? '✓ ' : '+ '} {key}
              </button>
            );
          })}
        </div>
      )}

      {/* SCHEDULES LIST */}
      <div className="w-full max-w-6xl space-y-24 mb-32">
        {filteredSchedules.map((sched, idx) => (
          <div key={idx} className="bg-white rounded-[3rem] shadow-2xl shadow-slate-2000/60 border border-slate-50 overflow-hidden group hover:shadow-blue-200/30 transition-shadow duration-500">
            <div className="px-10 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg font-black text-xs">{idx + 1}</span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Schedule Variation</h2>
              </div>
              <div className="flex gap-2">
                {sched.included_electives.map(el => <span key={el} className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100">+{el}</span>)}
                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${sched.status === 'open' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>{sched.status}</span>
              </div>
            </div>

            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* CALENDAR - STATIC BOX */}
              <div className="bg-slate-50 rounded-[2rem] p-6 shadow-2xl shadow-black-2000/60 border border-slate-100 aspect-[4/3] w-full max-h-[500px]">
                <div className="flex mb-4 border-b border-slate-200 pb-2">
                  <div className="w-12"></div>
                  {['M','T','W','T','F'].map((d, i) => <div key={i} className="flex-1 text-center text-[10px] font-black text-slate-400">{d}</div>)}
                </div>
                <div className="relative h-full flex">
                  <div className="w-12 flex flex-col justify-between text-[9px] font-black text-slate-300 pr-2 border-r border-slate-200/50 pb-8">
                    {['8am','10am','12pm','2pm','4pm','6pm','8pm'].map(h => <span key={h}>{h}</span>)}
                  </div>
                  {['monday','tuesday','wednesday','thursday','friday'].map(day => (
                    <div key={day} className="flex-1 relative border-r border-slate-200/30 last:border-r-0">
                      {sched.sections.map((s, si) => {
                        if (!s.schedule.toLowerCase().includes(day)) return null;
                        const style = getEventStyle(s.schedule);
                        if (!style) return null;
                        return (
                          <div key={si} className={`absolute w-[90%] left-[5%] rounded-lg flex flex-col items-center justify-center p-1 text-white shadow-lg shadow-black/10 transition-transform duration-300 hover:scale-105 z-10 ${colorPalette[si % colorPalette.length]}`} style={style}>
                            <span className="text-[8px] font-black uppercase text-center leading-none">{s.subject}</span>
                            <span className="text-[8px] font-black leading-none">{s.course}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* COURSE CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                {sched.sections.map((s, si) => (
                  <div 
                    key={si} 
                    className="p-5 bg-white border border-slate-900/10 rounded-[1.5rem] transition-all duration-300 hover:border-slate-900/30 hover:shadow-md group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Subtle color indicator */}
                        <div className={`w-1.5 h-4 rounded-full ${colorPalette[si % colorPalette.length].split(' ')[0]}`}></div>
                        <span className="font-black text-xs uppercase text-slate-800 tracking-tight">{s.subject} {s.course}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">CRN {s.crn}</span>
                    </div>
                    
                    <div className="text-[10px] font-bold text-slate-500 mb-4 flex gap-2">
                      <span className="uppercase text-slate-300">Section</span>
                      <span>{s.section}</span>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      {/* Seats Row */}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Seats</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${parseInt(s.seats) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <span className={`text-[10px] font-bold ${parseInt(s.seats) > 0 ? 'text-slate-700' : 'text-red-500'}`}>
                            {s.seats} Open
                          </span>
                        </div>
                      </div>

                      {/* Waitlist Row */}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Waitlist</span>
                        <span className={`text-[10px] font-bold ${parseInt(s.waitlist) > 0 ? 'text-slate-600' : 'text-slate-500'}`}>
                          {s.waitlist} Waiting
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}