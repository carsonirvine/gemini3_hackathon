# goes through all courses file and
# outputs a list of all possible subjects


import json

# 1. Load the file
with open('all_data.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# 2. Extract unique subjects and sort them
unique_subjects = sorted(list(set(item['instructionalMethod'] for item in data)))

# 3. Print or save the results
print(f"Found {len(unique_subjects)} unique methods:")
print(unique_subjects)