import json

filename = 'Data/courses_page_number.json'

def lookup(subject):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            courses = json.load(f)

        for course in courses:
            if course.get('subject') == subject:
                # Return the specific "page" value for this course
                return course.get('page')

        # If the loop finishes without finding the subject
        return None 

    except FileNotFoundError:
        print(f"Error: {filename} not found.")
        return None
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON.")
        return None