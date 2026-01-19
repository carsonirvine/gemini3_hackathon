import datetime
from itertools import product

def parse_to_minutes(time_str):
    """Converts '09:30 AM' style strings to minutes from midnight."""
    clean = time_str.replace('\xa0', ' ').strip().lower()
    t = datetime.datetime.strptime(clean, "%I:%M %p")
    return t.hour * 60 + t.minute

def get_seat_status(course):
    """
    Determines if a course is Open, Waitlist-able, or Full.
    Returns: 0 for Open, 1 for Waitlist Available, 2 for Full
    """
    seats_raw = course.get('seats', '0/0')
    waitlist_raw = course.get('waitlist', '0/0')
    
    try:
        # Format is 'Available/Total'
        s_avail, _ = map(int, seats_raw.split('/'))
        w_avail, w_total = map(int, waitlist_raw.split('/'))
        
        # 1. If there are physical seats, it's Open
        if s_avail > 0 and not w_total-(w_avail+s_avail) >= 0 :
            return 0 
        
        # 2. If no seats, check if waitlist has room
        if waitlist_raw and waitlist_raw != "N/A":
            w_avail, _ = map(int, waitlist_raw.split('/'))
            if w_avail > 0:
                return 1 # Room on waitlist
                
        return 2 # No seats and no waitlist
    except (ValueError, AttributeError):
        return 2

def is_lab_or_tutorial(course):
    """Your existing logic for filtering specific section types."""
    section = course.get('section', '')
    if section and section[0] in ('T', 'B'):
        return False
    return True

def analyze_combination(sections):
    """
    Checks a combination of courses for:
    1. Total availability (Open vs Waitlist)
    2. Time conflicts
    Returns: 'open', 'waitlist', or None (if conflict or full)
    """
    timeline = [] 
    has_waitlist_course = False

    for course in sections:
        # 1. SEAT CHECK
        status = get_seat_status(course)
        if status == 2: # Truly full
            return None
        if status == 1: # One or more courses are waitlisted
            has_waitlist_course = True
        
        # 2. SECTION TYPE CHECK
        if not is_lab_or_tutorial(course):
            return None

        # 3. TIME CONFLICT CHECK
        raw_sched = course.get('schedule', '')
        if "|" not in raw_sched or "TBA" in raw_sched.upper():
            continue

        try:
            days_part, times_part = raw_sched.split('|')
            start_str, end_str = times_part.split('-')
            start_m = parse_to_minutes(start_str)
            end_m = parse_to_minutes(end_str)
            days_list = [d.strip() for d in days_part.split(',')]

            for day in days_list:
                for (old_day, old_start, old_end) in timeline:
                    if day == old_day:
                        # Overlap logic: (StartA < EndB) and (EndA > StartB)
                        if start_m < old_end and end_m > old_start:
                            return None 
                
                timeline.append((day, start_m, end_m))
        except Exception:
            continue

    return "waitlist" if has_waitlist_course else "open"

def get_best_schedules(course_data):
    """
    Main entry point. Iterates all combinations and returns 
    valid ones sorted by availability status.
    """
    # Mandatory courses buckets
    buckets = list(course_data.get('mandatory', {}).values())
    
    # If you want to include electives in the same combination:
    # buckets += list(course_data.get('electives', {}).values())
    
    valid_results = []

    # 'product' tests every combination of sections
    for combo in product(*buckets):
        status = analyze_combination(combo)
        
        if status:
            valid_results.append({
                "status": status,
                "sections": list(combo)
            })
            
    # Sort: "open" schedules first, "waitlist" schedules second
    valid_results.sort(key=lambda x: x['status'])
                
    return valid_results