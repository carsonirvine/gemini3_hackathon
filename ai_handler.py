from google import genai
import sys
import json

course_list = []

import sys
import json

import sys
import json

def process_all_data():
    # Read from the pipe
    input_data = sys.stdin.read()
    
    if not input_data:
        print("DEBUG: AI Handler received NO data.")
        return

    try:
        master_list = json.loads(input_data)
        
        # --- VERIFICATION PRINTS ---
        print("\n" + "="*30)
        print("AI HANDLER VERIFICATION")
        print(f"Total Sections Received: {len(master_list)}")
        
        if len(master_list) > 0:
            # Print the first item to see the structure
            print(f"Sample Course: {master_list[0].get('subject')} {master_list[0].get('course')}")
            print(f"Data Type: {type(master_list)}")
        print("="*30 + "\n")

    except Exception as e:
        print(f"DEBUG: AI Handler failed to parse JSON: {e}")

if __name__ == "__main__":
    process_all_data()
# client = genai.Client()

# response = client.models.generate_content(
#     model="gemini-3-pro-preview",
#     contents="",
# )

# print(response.text)