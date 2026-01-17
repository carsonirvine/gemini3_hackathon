from flask import Flask, render_template, request, jsonify
import json
import subprocess
from pathlib import Path

app = Flask(__name__)
ROOT = Path(__file__).resolve().parent

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scrape', methods=['POST'])
def run_scrape():
    subject = request.json.get('subject', 'CSC').upper()
    
    # This runs your existing script as a separate process
    # and waits for it to finish.
    try:
        process = subprocess.run(
            ['python', 'course_search.py', subject],
            capture_output=True, text=True, check=True
        )
        
        # Load the JSON your script just created
        data_path = ROOT / "JSON_output" / f"{subject}_courses.json"
        if data_path.exists():
            with open(data_path, 'r') as f:
                results = json.load(f)
            return jsonify({"status": "success", "data": results})
        else:
            return jsonify({"status": "error", "message": "JSON file not found"}), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)