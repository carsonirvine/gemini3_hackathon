from flask import Flask, render_template, request, jsonify
import json
import subprocess
from pathlib import Path
import sys
import time

all_subjects = ['ADMN', 'AE', 'AHVS', 'ANTH', 'ART', 'ASL', 'ASTR', 'ATWP', 'BCMB', 'BIOC', 'BIOL', 'BME', 'BUS', 'CD', 'CE', 'CHEM', 'CIVE', 'CNPY', 'COM', 'CS', 'CSC', 'CSPT', 'CW', 'CYC', 'DR', 'ECE', 'ECON', 'ED-D', 'ED-P', 'EDCI', 'ENGR', 'ENSH', 'ENT', 'EOS', 'EPHE', 'ER', 'ES', 'EUS', 'FA', 'FORB', 'FRAN', 'GDS', 'GEOG', 'GMST', 'GNDR', 'GREE', 'GRS', 'GS', 'HINF', 'HLTH', 'HSTR', 'HUMA', 'ICDG', 'IED', 'IGOV', 'IN', 'INDW', 'INGH', 'INTD', 'INTS', 'IS', 'ISP', 'ITAL', 'LAS', 'LATI', 'LAW', 'LING', 'MATH', 'MBA', 'MDIA', 'MECH', 'MEDI', 'MEDS', 'MGB', 'MICR', 'MUS', 'NRSC', 'NUED', 'NUHI', 'NUNP', 'NURA', 'NURS', 'PAAS', 'PHIL', 'PHSP', 'PHYS', 'POLI', 'PSYC', 'RCS', 'SCIE', 'SDH', 'SENG', 'SJS', 'SLST', 'SOCI', 'SOCW', 'SPAN', 'STAT', 'TCA', 'THEA', 'TS', 'WRIT']

app = Flask(__name__)
ROOT = Path(__file__).resolve().parent

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scrape', methods=['POST'])
def run_scrape():
    subject = request.json.get('subject', 'CSC').upper()

    start_perf = time.perf_counter()

    if subject not in all_subjects:
        sys.stderr.write(f"INVALID_SUBJECT: {subject}")
        sys.exit(1) # Exit with error code 1
    try:
        # Run the scraper. Note: check=False (default) allows us to handle return codes ourselves
        process = subprocess.run(
            ['python', 'course_search.py', subject],
            capture_output=True, 
            text=True
        )

        duration = round(time.perf_counter() - start_perf, 2)
        
        # 1. Check if the scraper exited with an error (returncode 1)
        if process.returncode != 0:
            # Check if our custom "INVALID_SUBJECT" message is in the error output
            if "INVALID_SUBJECT" in process.stderr:
                return jsonify({
                    "status": "error", 
                    "message": f"'{subject}' is not a valid UVic subject."
                }), 400
            
            # General fallback for other crashes
            return jsonify({
                "status": "error", 
                "message": f"Scraper Error: {process.stderr}"
            }), 500

        # 2. If the scraper was successful, load the JSON
        data_path = ROOT / "JSON_output" / f"{subject}_courses.json"
        
        if data_path.exists():
            with open(data_path, 'r', encoding='utf-8') as f:
                results = json.load(f)
            return jsonify({"status": "success", "data": results, "search_time": duration})
        else:
            return jsonify({
                "status": "error", 
                "message": "Scraper finished but no data file was created."
            }), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)