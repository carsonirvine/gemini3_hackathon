import sys
import json

# Read the string from the "pipe" (stdin)
raw_input = sys.stdin.read()
all_courses = {}
if raw_input:
    # Turn the string back into a dictionary
    catalog = json.loads(raw_input)
    
    # Now you can use it!
    print(f"Success! Received {len(catalog)} courses.")
    for course_name in catalog:
        print(f"Indexing: {course_name}")
    all_courses = list(catalog.keys())
    print(f"all keys {all_courses}")
