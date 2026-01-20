// "use client";
// import { useState, useMemo } from "react";

// interface CourseSection {
//   subject: string;
//   course: string;
//   section: string;
//   crn: string;
//   schedule: string;
//   seats: string;
//   waitlist: string;
// }

// interface ScheduleCombination {
//   status: 'open' | 'waitlist' | 'full';
//   sections: CourseSection[];
//   included_electives: string[];
// }

// interface CourseRow {
//   id: number;
//   subject: string;
//   number: string;
//   type: 'mandatory' | 'elective';
// }

// export default function Home() {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
//   const [rows, setRows] = useState<CourseRow[]>([{ id: Date.now(), subject: "", number: "", type: 'mandatory' }]);
//   const [generatedSchedules, setGeneratedSchedules] = useState<ScheduleCombination[]>([]);
//   const [selectedElectives, setSelectedElectives] = useState<string[]>([]);

//   // Vivid palette for calendar blocks
//   const colorPalette = [
//     'bg-blue-600 border-blue-700 shadow-blue-200',
//     'bg-indigo-600 border-indigo-700 shadow-indigo-200',
//     'bg-violet-600 border-violet-700 shadow-violet-200',
//     'bg-fuchsia-600 border-fuchsia-700 shadow-fuchsia-200',
//     'bg-rose-600 border-rose-700 shadow-rose-200',
//     'bg-orange-600 border-orange-700 shadow-orange-200'
//   ];

//   const filteredSchedules = useMemo(() => {
//     return generatedSchedules.filter(sched => {
//       const schedElectives = sched.included_electives || [];
//       if (selectedElectives.length === 0) return schedElectives.length === 0;
//       return (
//         selectedElectives.length === schedElectives.length &&
//         selectedElectives.every(e => schedElectives.includes(e))
//       );
//     });
//   }, [generatedSchedules, selectedElectives]);

//   const getEventStyle = (timeStr: string) => {
//     const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
//     const matches = [...timeStr.matchAll(timeRegex)];
//     if (matches.length < 2) return null;

//     const parseToMins = (m: RegExpMatchArray) => {
//       let h = parseInt(m[1]);
//       if (m[3].toUpperCase() === "PM" && h < 12) h += 12;
//       if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
//       return h * 60 + parseInt(m[2]);
//     };

//     const start = parseToMins(matches[0]);
//     const end = parseToMins(matches[1]);
//     // 8:00 AM (480) to 9:00 PM (1260). Total: 780 mins.
//     return { 
//       top: `${((start - 480) / 780) * 100}%`, 
//       height: `${((end - start) / 780) * 100}%` 
//     };
//   };

//   const getStatusColor = (raw: string, isWait: boolean) => {
//     if (!raw.includes('/')) return "bg-gray-100 text-gray-400";
//     const avail = parseInt(raw.split('/')[0]);
//     if (avail <= 0) return "bg-red-50 text-red-700 border-red-200";
//     return isWait ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";
//   };

//   const updateRow = (id: number, field: 'subject' | 'number', val: string) => {
//     setRows(rows.map(r => r.id === id ? { ...r, [field]: val } : r));
//   };

//   const startBuild = async () => {
//     setLoading(true);
//     setStatusMessage({ text: "Compiling optimal routes...", type: 'info' });
//     try {
//       const active = rows.filter(r => r.subject && r.number);
//       const results = await Promise.all(active.map(async (r) => {
//         const res = await fetch(`http://127.0.0.1:8000/api/courses/${r.subject.toUpperCase()}/${r.number}`);
//         const json = await res.json();
//         return { key: `${r.subject.toUpperCase()}${r.number}`, data: json.data || [], type: r.type };
//       }));

//       const payload = { mandatory: {} as any, electives: {} as any };
//       results.forEach(item => { payload[item.type === 'mandatory' ? 'mandatory' : 'electives'][item.key] = item.data; });

//       const buildRes = await fetch(`http://127.0.0.1:8000/api/build-schedules`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });
//       const buildJson = await buildRes.json();
//       setGeneratedSchedules(buildJson.schedules || []);
//       setSelectedElectives([]); 
//       setStatusMessage({ text: `Done! Found ${buildJson.schedules?.length || 0} unique variations.`, type: 'success' });
//     } catch { setStatusMessage({ text: "Backend unreachable. Check python server.", type: 'error' }); }
//     setLoading(false);
//   };

//   return (
//     <main className="bg-[#fcfcfd] min-h-screen p-6 md:p-12 flex flex-col items-center font-sans antialiased text-slate-900">
      
//       {/* INPUT CARD */}
//       <div className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 mb-12">
//         <div className="flex flex-col items-center mb-10">
//           <div className="w-12 h-1 bg-blue-600 rounded-full mb-4"></div>
//           <h1 className="text-4xl font-black tracking-tighter text-slate-800">UVic Builder</h1>
//         </div>
        
//         {currentPage === 1 ? (
//           <div className="space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">01</span>
//               <h2 className="text-xl font-black text-slate-800">Mandatory Courses</h2>
//             </div>
            
//             <div className="space-y-3">
//               {rows.filter(r => r.type === 'mandatory').map(r => (
//                 <div key={r.id} className="flex gap-3 group">
//                   <input className="w-28 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold uppercase focus:bg-white focus:border-blue-500 focus:ring-4 ring-blue-50 outline-none transition-all" placeholder="CSC" value={r.subject} onChange={e => updateRow(r.id, 'subject', e.target.value)} />
//                   <input className="flex-1 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:bg-white focus:border-blue-500 focus:ring-4 ring-blue-50 outline-none transition-all" placeholder="111" value={r.number} onChange={e => updateRow(r.id, 'number', e.target.value)} />
//                   <button onClick={() => setRows(rows.filter(x => x.id !== r.id))} className="text-slate-300 hover:text-red-500 px-2 transition-colors">✕</button>
//                 </div>
//               ))}
//             </div>
            
//             <button onClick={() => setRows([...rows, { id: Date.now(), subject: "", number: "", type: 'mandatory' }])} 
//               className="group flex items-center gap-2 text-blue-600 font-black text-xs hover:gap-3 transition-all">
//               <span className="text-lg">+</span> ADD ANOTHER REQUIREMENT
//             </button>

//             <button onClick={() => setCurrentPage(2)} 
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-100 mt-6 transition-all hover:-translate-y-1 active:scale-[0.98]">
//               Next Step: Electives
//             </button>
//           </div>
//         ) : (
//           <div className="space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <span className="flex items-center justify-center w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black">02</span>
//               <h2 className="text-xl font-black text-slate-800">Elective Options</h2>
//             </div>

//             <div className="space-y-3">
//               {rows.filter(r => r.type === 'elective').map(r => (
//                 <div key={r.id} className="flex gap-3 group">
//                   <input className="w-28 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold uppercase focus:bg-white focus:border-emerald-500 focus:ring-4 ring-emerald-50 outline-none transition-all" placeholder="MATH" value={r.subject} onChange={e => updateRow(r.id, 'subject', e.target.value)} />
//                   <input className="flex-1 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:bg-white focus:border-emerald-500 focus:ring-4 ring-emerald-50 outline-none transition-all" placeholder="100" value={r.number} onChange={e => updateRow(r.id, 'number', e.target.value)} />
//                   <button onClick={() => setRows(rows.filter(x => x.id !== r.id))} className="text-slate-300 hover:text-red-500 px-2 transition-colors">✕</button>
//                 </div>
//               ))}
//             </div>

//             <button onClick={() => setRows([...rows, { id: Date.now(), subject: "", number: "", type: 'elective' }])} 
//               className="group flex items-center gap-2 text-emerald-600 font-black text-xs hover:gap-3 transition-all">
//               <span className="text-lg">+</span> ADD ELECTIVE VARIATION
//             </button>

//             <div className="flex gap-4 mt-8">
//               <button onClick={() => setCurrentPage(1)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-[1.5rem] font-black transition-all">Back</button>
//               <button onClick={startBuild} disabled={loading} 
//                 className="flex-[2] bg-slate-900 hover:bg-black text-white py-5 rounded-[1.5rem] font-black shadow-2xl transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50">
//                 {loading ? "Crunching Data..." : "Generate My Schedules"}
//               </button>
//             </div>
//           </div>
//         )}
//         {statusMessage && <div className={`mt-8 p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest animate-pulse ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{statusMessage.text}</div>}
//       </div>

//       {/* FILTER BUTTONS */}
//       {generatedSchedules.length > 0 && (
//         <div className="w-full max-w-4xl mb-12">
//           <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Toggle Elective Mix</p>
//           <div className="flex flex-wrap gap-3 justify-center">
//             <button onClick={() => setSelectedElectives([])} 
//               className={`px-8 py-3 rounded-2xl text-xs font-black transition-all shadow-sm ${selectedElectives.length === 0 ? 'bg-slate-900 text-white scale-105' : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-slate-300'}`}>
//               Mandatory Only
//             </button>
//             {Array.from(new Set(rows.filter(r => r.type === 'elective' && r.subject).map(e => `${e.subject.toUpperCase()}${e.number}`))).map(key => {
//               const active = selectedElectives.includes(key);
//               return (
//                 <button key={key} onClick={() => setSelectedElectives(prev => active ? prev.filter(x => x !== key) : [...prev, key])} 
//                   className={`px-8 py-3 rounded-2xl text-xs font-black transition-all border-2 shadow-sm ${active ? 'bg-emerald-600 border-emerald-600 text-white scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}>
//                   {active ? '✓ ' : '+ '} {key}
//                 </button>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {/* SCHEDULES LIST */}
//       <div className="w-full max-w-5xl space-y-32 mb-20">
//         {filteredSchedules.map((sched, idx) => (
//           <div key={idx} className="bg-white p-6 md:p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.04)] border border-slate-50 transition-all hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)]">
            
//             <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
//               <div className="flex items-center gap-4">
//                 <span className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-2xl font-black text-lg shadow-lg rotate-3">{idx + 1}</span>
//                 <div>
//                   <h2 className="text-3xl font-black tracking-tight text-slate-800">Best Option</h2>
//                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optimized for minimal gaps</p>
//                 </div>
//               </div>
//               <div className="flex items-center gap-3">
//                  {sched.included_electives.map(el => (
//                    <span key={el} className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl border border-emerald-100 uppercase tracking-tighter">with {el}</span>
//                  ))}
//                  <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase border tracking-widest ${sched.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{sched.status}</span>
//               </div>
//             </div>

//             {/* CALENDAR GRID */}
//             <div className="bg-slate-50/80 p-6 md:p-10 rounded-[2.5rem] border border-slate-100 mb-12 shadow-inner">
//               <div className="flex mb-6 opacity-40 text-[11px] font-black text-slate-500">
//                 <div className="w-20"></div>
//                 {['MON','TUE','WED','THU','FRI'].map(d => <div key={d} className="flex-1 text-center tracking-[0.2em]">{d}</div>)}
//               </div>
              
//               <div className="relative h-[450px] flex gap-4">
//                 {/* Time Axis */}
//                 <div className="w-20 flex flex-col justify-between text-[10px] font-black text-slate-300 py-2 border-r border-slate-200/50">
//                   <span>8:00 AM</span><span>10:00 AM</span><span>12:00 PM</span><span>2:00 PM</span><span>4:00 PM</span><span>6:00 PM</span><span>8:00 PM</span>
//                 </div>
                
//                 {['monday','tuesday','wednesday','thursday','friday'].map(day => (
//                   <div key={day} className="flex-1 relative bg-white/40 rounded-2xl border border-dashed border-slate-200 shadow-sm">
//                     {/* Grid Lines */}
//                     {[...Array(13)].map((_, i) => (
//                       <div key={i} className="absolute w-full border-t border-slate-100/50" style={{ top: `${(i / 13) * 100}%` }}></div>
//                     ))}
                    
//                     {sched.sections.map((s, si) => {
//                       if (!s.schedule.toLowerCase().includes(day)) return null;
//                       const style = getEventStyle(s.schedule);
//                       if (!style) return null;
//                       return (
//                         <div key={si} 
//                           className={`absolute w-[92%] left-[4%] rounded-xl shadow-md border-2 border-white/20 flex flex-col items-center justify-center p-2 transition-transform hover:scale-[1.02] hover:z-10 cursor-default ${colorPalette[si % colorPalette.length]}`} 
//                           style={style}>
//                           <span className="text-[9px] font-black text-white uppercase text-center leading-none">{s.subject} {s.course}</span>
//                           <span className="text-[7px] font-bold text-white/70 mt-1 uppercase">{s.section}</span>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* SECTIONS GRID */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {sched.sections.map((s, si) => (
//                 <div key={si} className="group p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-blue-100 hover:shadow-xl transition-all duration-300">
//                   <div className="flex justify-between items-start mb-4">
//                     <div className="flex items-center gap-3">
//                       <div className={`w-3 h-3 rounded-full ${colorPalette[si % colorPalette.length].split(' ')[0]}`}></div>
//                       <div>
//                         <p className="font-black text-slate-800 tracking-tight">{s.subject} {s.course}</p>
//                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section {s.section}</p>
//                       </div>
//                     </div>
//                     <div className="flex flex-col gap-1 items-end">
//                       <div className={`text-[8px] font-black px-2 py-1 rounded-lg border shadow-sm ${getStatusColor(s.seats, false)}`}>Seats: {s.seats}</div>
//                       <div className={`text-[8px] font-black px-2 py-1 rounded-lg border shadow-sm ${getStatusColor(s.waitlist, true)}`}>Wait: {s.waitlist}</div>
//                     </div>
//                   </div>
//                   <div className="bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 text-center shadow-inner group-hover:border-blue-50 transition-colors">
//                     {s.schedule.split('|')[1] || "No Fixed Time"}
//                   </div>
//                   <div className="mt-3 text-[8px] font-black text-center text-slate-300 group-hover:text-blue-400 uppercase tracking-widest">CRN: {s.crn}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//         {generatedSchedules.length > 0 && filteredSchedules.length === 0 && (
//           <div className="text-center py-20 bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
//             <p className="text-2xl font-black text-slate-200 uppercase tracking-[0.5em]">No Valid Mix</p>
//           </div>
//         )}
//       </div>
//     </main>
//   );
// }


"use client";
import { useState, useMemo } from "react";

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
  const MAX_ELECTIVE = 3;

  const mandatoryCount = rows.filter(r => r.type === 'mandatory').length;
  const electiveCount = rows.filter(r => r.type === 'elective').length;
  const totalCount = rows.length;

  // Logic: Can add if type limit isn't reached AND total limit isn't reached
  const canAddMandatory = mandatoryCount < MAX_MANDATORY && totalCount < MAX_TOTAL;
  const canAddElective = electiveCount < MAX_ELECTIVE && totalCount < MAX_TOTAL;

  const filteredSchedules = useMemo(() => {
    if (selectedElectives.length === 0) {
      return generatedSchedules.filter(s => (s.included_electives || []).length === 0);
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
    setStatusMessage({ text: "Building schedules...", type: 'info' });
    try {
      const active = rows.filter(r => r.subject && r.number);
      const results = await Promise.all(active.map(async (r) => {
        const res = await fetch(`http://127.0.0.1:8000/api/courses/${r.subject.toUpperCase()}/${r.number}`);
        const json = await res.json();
        return { key: `${r.subject.toUpperCase()}${r.number}`, data: json.data || [], type: r.type };
      }));
      const payload = { mandatory: {} as any, electives: {} as any };
      results.forEach(item => { payload[item.type === 'mandatory' ? 'mandatory' : 'electives'][item.key] = item.data; });
      const buildRes = await fetch(`http://127.0.0.1:8000/api/build-schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const buildJson = await buildRes.json();
      setGeneratedSchedules(buildJson.schedules || []);
      setSelectedElectives([]); 
      setStatusMessage({ text: "Schedules Ready", type: 'success' });
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
            <span>Course Load</span>
            <span>{totalCount} / {MAX_TOTAL}</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {/* Blue Segment for Mandatory */}
            <div 
              className="h-full bg-blue-500 transition-all duration-500" 
              style={{ width: `${(mandatoryCount / MAX_TOTAL) * 100}%` }}
            ></div>
            {/* Green Segment for Electives */}
            <div 
              className="h-full bg-emerald-400 transition-all duration-500" 
              style={{ width: `${(electiveCount / MAX_TOTAL) * 100}%` }}
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
              {totalCount >= MAX_TOTAL ? "Total Limit Reached" : mandatoryCount >= MAX_MANDATORY ? "Mandatory Limit Reached" : "Add Course"}
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
              {totalCount >= MAX_TOTAL ? "Total Limit Reached" : electiveCount >= MAX_ELECTIVE ? "Elective Limit Reached" : "Add Elective"}
            </button>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setCurrentPage(1)} 
                className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-3xl font-black hover:bg-slate-200 transition-all duration-300">
                Back
              </button>
              <button onClick={startBuild} disabled={loading} 
                className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-lg hover:bg-emerald-500 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 disabled:opacity-50">
                {loading ? "Crunching..." : "Build Schedules"}
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
            Time Conflict: <span className="underline decoration-2">{conflicts.join(", ")}</span> could not fit.
          </p>
        </div>
      )}

      {/* RESULT FILTERS */}
      {generatedSchedules.length > 0 && (
        <div className="w-full max-w-4xl mb-12 flex flex-wrap gap-2 justify-center">
          <button onClick={() => setSelectedElectives([])} 
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${selectedElectives.length === 0 ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
            Mandatory Only
          </button>
          {Array.from(new Set(rows.filter(r => r.type === 'elective' && r.subject).map(e => `${e.subject.toUpperCase()}${e.number}`))).map(key => {
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