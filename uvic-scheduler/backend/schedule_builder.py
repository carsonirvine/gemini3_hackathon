import datetime
from itertools import product
from collections import defaultdict

def parse_to_minutes(time_str):
    if not time_str or "TBA" in time_str.upper():
        return None
    try:
        clean = time_str.replace('\xa0', ' ').strip().lower()
        t = datetime.datetime.strptime(clean, "%I:%M %p")
        return t.hour * 60 + t.minute
    except:
        return None

def get_seat_status(course):
    """
    0: Open, 1: Waitlist, 2: Full
    Decoupled parsing to prevent one missing field from breaking the other.
    """
    seats_raw = str(course.get('seats', '0/0')).replace('\xa0', ' ').strip()
    waitlist_raw = str(course.get('waitlist', '0/0')).replace('\xa0', ' ').strip()
    
    s_avail = 0
    w_avail = 0

    # 1. Try to parse physical seats
    try:
        if '/' in seats_raw:
            s_avail = int(seats_raw.split('/')[0].strip())
        else:
            s_avail = int(seats_raw)
    except (ValueError, IndexError):
        s_avail = 0 # Default to 0 if we can't read it

    # 2. If seats are available, return OPEN immediately
    if s_avail > 0:
        return 0

    # 3. If no seats, try to parse waitlist
    try:
        if '/' in waitlist_raw:
            w_avail = int(waitlist_raw.split('/')[0].strip())
        elif waitlist_raw.isdigit():
            w_avail = int(waitlist_raw)
        else:
            w_avail = 0
    except (ValueError, IndexError):
        w_avail = 0

    if w_avail > 0:
        return 1 # Waitlist has room
        
    return 2 # Truly full

def check_overlap(sec1, sec2):
    sched1 = sec1.get('schedule', '')
    sched2 = sec2.get('schedule', '')
    if "|" not in sched1 or "|" not in sched2: return False
    if "TBA" in sched1.upper() or "TBA" in sched2.upper(): return False
    try:
        d1_part, t1_part = sched1.split('|')
        d2_part, t2_part = sched2.split('|')
        times1 = [parse_to_minutes(t.strip()) for t in t1_part.split('-')]
        times2 = [parse_to_minutes(t.strip()) for t in t2_part.split('-')]
        if None in times1 or None in times2: return False
        s1, e1 = times1
        s2, e2 = times2
        days1 = set(d.strip().lower() for d in d1_part.split(','))
        days2 = set(d.strip().lower() for d in d2_part.split(','))
        if days1.intersection(days2):
            if s1 < e2 and e1 > s2: return True
    except: pass
    return False

def get_best_schedules(course_data):
    mandatory_courses = course_data.get('mandatory', {})
    if not mandatory_courses: return []

    course_bundles = []
    for course_id, sections in mandatory_courses.items():
        groups = defaultdict(list)
        for s in sections:
            sec_code = s.get('section', 'A').strip().upper()
            prefix = sec_code[0]
            groups[prefix].append(s)

        # Include A (Lec), B (Lab), T (Tut), L (Lab)
        needed_types = [groups[p] for p in ['A', 'B', 'T', 'L'] if groups[p]]
        if not needed_types: continue

        valid_course_units = []
        for combo in product(*needed_types):
            if not any(check_overlap(combo[i], combo[j]) for i in range(len(combo)) for j in range(i + 1, len(combo))):
                valid_course_units.append(list(combo))
        
        if valid_course_units:
            course_bundles.append(valid_course_units)

    final_results = []
    all_possible_schedules = product(*course_bundles)
    
    count = 0
    for schedule_combo in all_possible_schedules:
        count += 1
        flat_list = [sec for unit in schedule_combo for sec in unit]
        
        # Conflict Check
        is_valid = True
        for i in range(len(flat_list)):
            for j in range(i + 1, len(flat_list)):
                if check_overlap(flat_list[i], flat_list[j]):
                    is_valid = False
                    break
            if not is_valid: break
            
        if is_valid:
            # STATUS CALCULATION
            # Logic: If ANY section is full, whole schedule is 'full'.
            # If NO section is full but SOME are waitlisted, whole schedule is 'waitlist'.
            # Else 'open'.
            max_status = 0
            for sec in flat_list:
                s = get_seat_status(sec)
                if s > max_status:
                    max_status = s
            
            # This print helps you verify the status calculation in real-time
            # print(f"DEBUG: Schedule Valid. Max Status: {max_status}")

            status_map = {0: "open", 1: "waitlist", 2: "full"}
            final_results.append({
                "status": status_map[max_status],
                "sections": flat_list
            })
            
        if len(final_results) >= 100 or count > 30000: 
            break

    status_priority = {"open": 0, "waitlist": 1, "full": 2}
    final_results.sort(key=lambda x: status_priority.get(x['status'], 3))
    
    return final_results