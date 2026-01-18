from flask import Flask, render_template, request, jsonify
import json
import subprocess
from pathlib import Path
import sys
import time

app = Flask(__name__)
ROOT = Path(__file__).resolve().parent

all_subjects = ['ADMN', 'AE', 'AHVS', 'ANTH', 'ART', 'ASL', 'ASTR', 'ATWP', 'BCMB', 'BIOC', 'BIOL', 'BME', 'BUS', 'CD', 'CE', 'CHEM', 'CIVE', 'CNPY', 'COM', 'CS', 'CSC', 'CSPT', 'CW', 'CYC', 'DR', 'ECE', 'ECON', 'ED-D', 'ED-P', 'EDCI', 'ENGR', 'ENSH', 'ENT', 'EOS', 'EPHE', 'ER', 'ES', 'EUS', 'FA', 'FORB', 'FRAN', 'GDS', 'GEOG', 'GMST', 'GNDR', 'GREE', 'GRS', 'GS', 'HINF', 'HLTH', 'HSTR', 'HUMA', 'ICDG', 'IED', 'IGOV', 'IN', 'INDW', 'INGH', 'INTD', 'INTS', 'IS', 'ISP', 'ITAL', 'LAS', 'LATI', 'LAW', 'LING', 'MATH', 'MBA', 'MDIA', 'MECH', 'MEDI', 'MEDS', 'MGB', 'MICR', 'MUS', 'NRSC', 'NUED', 'NUHI', 'NUNP', 'NURA', 'NURS', 'PAAS', 'PHIL', 'PHSP', 'PHYS', 'POLI', 'PSYC', 'RCS', 'SCIE', 'SDH', 'SENG', 'SJS', 'SLST', 'SOCI', 'SOCW', 'SPAN', 'STAT', 'TCA', 'THEA', 'TS', 'WRIT']

@app.route('/')
def index():
    return render_template('index.html')

def send_to_ai(course_data):
    print(f"DEBUG: Attempting to send {len(course_data)} courses to ai_handler.py...")
    try:
        process = subprocess.Popen(
            [sys.executable, 'ai_handler.py'], # Using sys.executable is safer
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # This sends the data and waits for the response
        stdout, stderr = process.communicate(input=json.dumps(course_data))
        
        # --- THIS LINE IS CRITICAL ---
        # If you don't have this, the AI handler's prints stay hidden in the 'stdout' variable
        if stdout:
            print("\n--- AI HANDLER OUTPUT ---")
            print(stdout)
            print("--------------------------\n")
            
        if stderr:
            print(f"AI HANDLER ERROR: {stderr}")
            
    except Exception as e:
        print(f"FAILED TO EXECUTE AI_HANDLER: {e}")

@app.route('/scrape', methods=['POST'])
def run_scrape():
    subject = request.json.get('subject', 'CSC').upper()
    course_num = request.json.get('course_num', '')
    start_perf = time.perf_counter()

    try:
        # Run the scraper
        process = subprocess.run(
            ['python', 'course_search.py', subject, course_num],
            capture_output=True, 
            text=True
        )
        
        duration = round(time.perf_counter() - start_perf, 2)

        # Check for non-zero exit code (e.g., script crash)
        if process.returncode != 0:
            if "INVALID_SUBJECT" in process.stderr:
                return jsonify({"status": "error", "message": f"'{subject}' is not a valid UVic subject."}), 400
            
            print(f"Scraper Error: {process.stderr}")
            return jsonify({"status": "error", "message": "Scraper failed. See server logs."}), 500

        # Parse JSON directly from the scraper's print output
        try:
            results = json.loads(process.stdout)
            
            # --- AI HANDLER INTEGRATION ---
            # Pass the results to the AI handler before responding to frontend
            #send_to_ai(results)
            # ------------------------------

            return jsonify({
                "status": "success", 
                "data": results, 
                "search_time": duration
            })
        except json.JSONDecodeError:
            print("JSON Decode Error. Raw Output:", process.stdout)
            return jsonify({"status": "error", "message": "Invalid output from scraper"}), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/analyze_all', methods=['POST'])
def analyze_all():
    # 1. Get the dictionary from the browser
    course_catalog = request.json.get('all_courses', {})

    # 2. Start (spawn) the ai_handler.py process
    process = subprocess.Popen(
        [sys.executable, 'ai_handler.py'], # Use sys.executable to ensure it finds your Python
        stdin=subprocess.PIPE,             # Open a "mouth" to receive data
        stdout=subprocess.PIPE,            # Open an "ear" to hear back
        stderr=subprocess.PIPE,            # Catch errors
        text=True                          # Send as string text, not bytes
    )

    # 3. Send the dictionary and get the result
    # This is where the communication actually happens
    stdout, stderr = process.communicate(input=json.dumps(course_catalog))

    # 4. Print it so you can verify it in your terminal
    if stdout:
        print("--- AI HANDLER OUTPUT ---")
        print(stdout)
    
    if stderr:
        print(f"--- AI HANDLER ERROR ---\n{stderr}")

    return jsonify({"status": "success"})


if __name__ == '__main__':
    app.run(debug=True)