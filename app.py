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
    """
    Passes the scraped JSON data to ai_handler.py via stdin
    """
    try:
        # We run the ai_handler.py script and pipe the JSON data into it
        process = subprocess.Popen(
            ['python', 'ai_handler.py'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        # Send the data as a string
        stdout, stderr = process.communicate(input=json.dumps(course_data))
        
        # Log AI handler responses/errors to the Flask terminal
        if stdout:
            print(f"AI Handler Output: {stdout.strip()}")
        if stderr:
            print(f"AI Handler Error: {stderr.strip()}")
            
    except Exception as e:
        print(f"Failed to send to AI: {e}")

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
            send_to_ai(results)
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
    full_course_list = request.json.get('all_courses', [])
    
    if not full_course_list:
        return jsonify({"status": "error", "message": "No courses to analyze"}), 400

    # Call the AI handler once with the complete list
    send_to_ai(full_course_list)
    
    return jsonify({"status": "success", "message": "Full list sent to AI handler"})


if __name__ == '__main__':
    app.run(debug=True)