import json

# Replace 'courses.json' with your actual filename
filename = 'Data/courses_page_number.json'

try:
    with open(filename, 'r', encoding='utf-8') as f:
        # Load the entire list of courses into memory
        courses = json.load(f)

    found = False
    # Iterate through the list of 3612 courses
    for course in courses:
        # Check if the 'subject' key matches 'CSC'
        if course.get('subject') == 'CSC':
            print("--- First Instance Found ---")
            print(json.dumps(course, indent=4))
            found = True
            break  # Stop the loop immediately after finding the first one

    if not found:
        print("No courses with subject 'CSC' were found.")

except FileNotFoundError:
    print(f"Error: The file '{filename}' was not found.")
except json.JSONDecodeError:
    print("Error: Failed to decode JSON. Check the file format.")