import datetime
from itertools import product

def parse_to_minutes(time_str):
    clean = time_str.replace('\xa0', ' ').strip().lower()
    t = datetime.datetime.strptime(clean, "%I:%M %p")
    return t.hour * 60 + t.minute

def has_seats_remaining(course):
    """
    In this system, '37/160' means 37 seats are LEFT.
    A class is full only if it is '0/X'.
    """
    waitlist_raw = course.get('waitlist', '0/0')
    seats_raw = course.get('seats', '0/0')
    try:
        seats_available, seats_total = map(int, seats_raw.split('/'))
        waitlist_available, waitlist_total = map(int, waitlist_raw.split('/'))
        # The class is valid only if there is at least 1 seat left
        if waitlist_total - waitlist_available > 0:
            return False
        return seats_available - (waitlist_available-waitlist_total) > 0
    except (ValueError, AttributeError):
        # If data is missing or malformed, assume 0 to avoid errors
        return False

def is_lab_or_tutorial(course):
    section = course.get('section')
    if section[0] in ('T', 'B'):
        return False
    return True

def is_conflict_free(sections):
    timeline = [] 

    for course in sections:
        # 1. AVAILABILITY CHECK: 
        # Skip this combination immediately if seats are 0
        if not has_seats_remaining(course):
            return False
        
        if not is_lab_or_tutorial(course):
            return False

        # 2. TIME CONFLICT CHECK:
        raw_sched = course.get('schedule', '')
        if "|" not in raw_sched or "TBA" in raw_sched.upper():
            continue

        days_part, times_part = raw_sched.split('|')
        start_str, end_str = times_part.split('-')

        start_m = parse_to_minutes(start_str)
        end_m = parse_to_minutes(end_str)

        days_list = [d.strip() for d in days_part.split(',')]

        for day in days_list:
            for (old_day, old_start, old_end) in timeline:
                if day == old_day:
                    # Standard overlap logic
                    if start_m < old_end and end_m > old_start:
                        return False 
            
            timeline.append((day, start_m, end_m))

    return True 

def get_best_schedules(course_data):
    buckets = list(course_data['mandatory'].values())
    valid_results = []

    # 'product' tests every combination of sections
    for combo in product(*buckets):
        if is_conflict_free(combo):
            valid_results.append(list(combo))
                
    return valid_results