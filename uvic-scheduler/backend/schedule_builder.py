import datetime
from itertools import product, chain, combinations
from collections import defaultdict

def parse_to_minutes(time_str):
    if not time_str or "TBA" in time_str.upper():
        return None
    try:
        # Normalize spaces and case
        clean = time_str.replace('\xa0', ' ').strip().lower()
        # Ensure space before am/pm for strptime
        if 'am' in clean and ' am' not in clean: clean = clean.replace('am', ' am')
        if 'pm' in clean and ' pm' not in clean: clean = clean.replace('pm', ' pm')
        
        t = datetime.datetime.strptime(clean, "%I:%M %p")
        return t.hour * 60 + t.minute
    except:
        return None

def get_seat_status(course):
    seats_raw = str(course.get('seats', '0/0')).replace('\xa0', ' ').strip()
    waitlist_raw = str(course.get('waitlist', '0/0')).replace('\xa0', ' ').strip()
    s_avail, w_avail = 0, 0
    try:
        s_avail = int(seats_raw.split('/')[0].strip()) if '/' in seats_raw else int(seats_raw)
    except: s_avail = 0
    if s_avail > 0: return 0
    try:
        w_avail = int(waitlist_raw.split('/')[0].strip()) if '/' in waitlist_raw else int(waitlist_raw)
    except: w_avail = 0
    return 1 if w_avail > 0 else 2

def check_overlap(sec1, sec2):
    sched1, sched2 = sec1.get('schedule', ''), sec2.get('schedule', '')
    if "|" not in sched1 or "|" not in sched2: return False
    if "TBA" in sched1.upper() or "TBA" in sched2.upper(): return False
    try:
        d1_part, t1_part = sched1.split('|')
        d2_part, t2_part = sched2.split('|')
        
        # Parse day sets
        days1 = set(d.strip().lower() for d in d1_part.split(','))
        days2 = set(d.strip().lower() for d in d2_part.split(','))
        
        if days1.intersection(days2):
            times1 = [parse_to_minutes(t.strip()) for t in t1_part.split('-')]
            times2 = [parse_to_minutes(t.strip()) for t in t2_part.split('-')]
            if None in times1 or None in times2: return False
            # Standard interval overlap formula
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

def get_best_schedules(course_data):
    mandatory_data = course_data.get('mandatory', {})
    elective_data = course_data.get('electives', {})
    
    # 1. Mandatory Bundles
    mandatory_bundles = []
    for c_id, sections in mandatory_data.items():
        bundle = get_course_bundles(sections)
        if not bundle: return [] 
        mandatory_bundles.append(bundle)

    # 2. Elective Bundles
    elective_bundles_map = {}
    for c_id, sections in elective_data.items():
        bundle = get_course_bundles(sections)
        if bundle: elective_bundles_map[c_id] = bundle

    # 3. Power Set of Electives
    elective_keys = list(elective_bundles_map.keys())
    elective_subsets = chain.from_iterable(combinations(elective_keys, r) for r in range(len(elective_keys) + 1))
    
    all_raw_schedules = []
    
    # 4. Generate permutations
    for subset in elective_subsets:
        current_pools = list(mandatory_bundles)
        for e_id in subset:
            current_pools.append(elective_bundles_map[e_id])
            
        for combo in product(*current_pools):
            flat_list = [sec for unit in combo for sec in unit]
            
            if not any(check_overlap(flat_list[i], flat_list[j]) for i in range(len(flat_list)) for j in range(i + 1, len(flat_list))):
                max_status = 0
                for sec in flat_list:
                    s = get_seat_status(sec)
                    if s > max_status: max_status = s
                
                status_map = {0: "open", 1: "waitlist", 2: "full"}
                all_raw_schedules.append({
                    "status": status_map[max_status],
                    "sections": flat_list,
                    "included_electives": list(subset)
                })
        
        if len(all_raw_schedules) >= 10000: break

    # 5. Sort by status
    status_priority = {"open": 0, "waitlist": 1, "full": 2}
    all_raw_schedules.sort(key=lambda x: status_priority.get(x['status'], 3))

    # 6. Diversity Filter per Combination
    # This ensures "Elective A" options aren't deleted just because "Mandatory" options were better
    final_selection = []
    by_elective_set = defaultdict(list)
    for res in all_raw_schedules:
        key = tuple(sorted(res['included_electives']))
        by_elective_set[key].append(res)

    for combo_key, schedules in by_elective_set.items():
        diverse_per_combo = []
        for current in schedules:
            if len(diverse_per_combo) >= 3: break # Keep top 3 for every combination
            
            current_ids = {s.get('crn') or s.get('section') for s in current['sections']}
            is_different = True
            for selected in diverse_per_combo:
                selected_ids = {s.get('crn') or s.get('section') for s in selected['sections']}
                # If they share almost all sections, they aren't diverse
                if len(current_ids.symmetric_difference(selected_ids)) < 2:
                    is_different = False
                    break
            if is_different:
                diverse_per_combo.append(current)
        final_selection.extend(diverse_per_combo)

    return final_selection