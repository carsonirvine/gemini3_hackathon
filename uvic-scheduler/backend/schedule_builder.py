import datetime
from itertools import product, chain, combinations
from collections import defaultdict

def parse_to_minutes(time_str):
    if not time_str or "TBA" in time_str.upper():
        return None
    try:
        clean = time_str.replace('\xa0', ' ').strip().lower()
        if 'am' in clean and ' am' not in clean: clean = clean.replace('am', ' am')
        if 'pm' in clean and ' pm' not in clean: clean = clean.replace('pm', ' pm')
        t = datetime.datetime.strptime(clean, "%I:%M %p")
        return t.hour * 60 + t.minute
    except:
        return None

def get_seat_status(course):
    seats_raw = str(course.get('seats', '0/0')).replace('\xa0', ' ').strip()
    waitlist_raw = str(course.get('waitlist', '0/0')).replace('\xa0', ' ').strip()
    try: s_avail = int(seats_raw.split('/')[0]) if '/' in seats_raw else int(seats_raw)
    except: s_avail = 0
    if s_avail > 0: return 0 # Open
    try: w_avail = int(waitlist_raw.split('/')[0]) if '/' in waitlist_raw else int(waitlist_raw)
    except: w_avail = 0
    return 1 if w_avail > 0 else 2 # Waitlist or Full

def check_overlap(sec1, sec2):
    sched1, sched2 = sec1.get('schedule', ''), sec2.get('schedule', '')
    if "|" not in sched1 or "|" not in sched2: return False
    if "TBA" in sched1.upper() or "TBA" in sched2.upper(): return False
    try:
        d1_part, t1_part = sched1.split('|')
        d2_part, t2_part = sched2.split('|')
        days1 = set(d.strip().lower() for d in d1_part.split(','))
        days2 = set(d.strip().lower() for d in d2_part.split(','))
        if days1.intersection(days2):
            times1 = [parse_to_minutes(t.strip()) for t in t1_part.split('-')]
            times2 = [parse_to_minutes(t.strip()) for t in t2_part.split('-')]
            if None in times1 or None in times2: return False
            if times1[0] < times2[1] and times1[1] > times2[0]: return True
    except: pass
    return False

def get_course_bundles(sections):
    groups = defaultdict(list)
    for s in sections:
        prefix = s.get('section', 'A').strip().upper()[0]
        groups[prefix].append(s)
    needed_types = [groups[p] for p in ['A', 'B', 'T', 'L'] if groups[p]]
    if not needed_types: return []
    valid_units = []
    for combo in product(*needed_types):
        if not any(check_overlap(combo[i], combo[j]) for i in range(len(combo)) for j in range(i + 1, len(combo))):
            valid_units.append(list(combo))
    return valid_units

# --- UPDATED FUNCTION SIGNATURE AND LOGIC ---
def get_best_schedules(course_data, target_count):
    mandatory_data = course_data.get('mandatory', {})
    elective_data = course_data.get('electives', {})
    
    # 1. Prepare Mandatory Bundles
    mandatory_bundles = []
    for c_id, sections in mandatory_data.items():
        bundle = get_course_bundles(sections)
        if not bundle: return [] # Impossible: A mandatory course has internal conflicts or no sections
        mandatory_bundles.append(bundle)

    # 2. Check Feasibility
    num_mandatory = len(mandatory_bundles)
    if num_mandatory > target_count:
        print(f"Error: User wants {target_count} courses but selected {num_mandatory} mandatory ones.")
        return [] # Impossible to satisfy

    # 3. Calculate how many electives we need to fill the rest
    needed_electives_count = target_count - num_mandatory

    # 4. Prepare Elective Bundles
    elective_bundles_map = {}
    for c_id, sections in elective_data.items():
        bundle = get_course_bundles(sections)
        if bundle: elective_bundles_map[c_id] = bundle

    elective_keys = list(elective_bundles_map.keys())
    
    if len(elective_keys) < needed_electives_count:
        print("Error: Not enough electives provided to reach target count.")
        return []

    # 5. Generate Combinations of Electives (Targeted Size)
    # This replaces the old "Power Set" logic. We ONLY get combinations of size 'needed_electives_count'
    elective_combinations = combinations(elective_keys, needed_electives_count)
    
    all_raw_schedules = []
    
    # 6. Build Schedules
    for subset_keys in elective_combinations:
        # Pool = All Mandatory Bundles + Specific Elective Bundles for this combination
        current_pools = list(mandatory_bundles)
        for e_id in subset_keys:
            current_pools.append(elective_bundles_map[e_id])
            
        # Cartesian Product to mix-and-match specific sections (A01 vs A02)
        for combo in product(*current_pools):
            flat_list = [sec for unit in combo for sec in unit]
            
            # Check for conflicts between ANY sections in this potential schedule
            if not any(check_overlap(flat_list[i], flat_list[j]) for i in range(len(flat_list)) for j in range(i + 1, len(flat_list))):
                
                # Scoring (Prioritize Open Seats)
                max_status = 0
                for sec in flat_list:
                    s = get_seat_status(sec)
                    if s > max_status: max_status = s
                
                status_map = {0: "open", 1: "waitlist", 2: "full"}
                all_raw_schedules.append({
                    "status": status_map[max_status],
                    "sections": flat_list,
                    "included_electives": list(subset_keys)
                })

    # 7. Sort & Diversity Filter (Keep top 3 best times for each elective combo)
    status_priority = {"open": 0, "waitlist": 1, "full": 2}
    all_raw_schedules.sort(key=lambda x: status_priority.get(x['status'], 3))

    final_selection = []
    by_elective_set = defaultdict(list)
    for res in all_raw_schedules:
        key = tuple(sorted(res['included_electives']))
        by_elective_set[key].append(res)

    for combo_key, schedules in by_elective_set.items():
        final_selection.extend(schedules[:3]) # Limit to top 3 variations per elective combo

    return final_selection