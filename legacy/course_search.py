import json
import time
# import course_lookup as lookup  <-- Remove this if you aren't using it, imports might print text!
from selenium import webdriver
from pathlib import Path
import sys
from selenium.webdriver.chrome.options import Options

# --- CONFIGURATION ---
all_subjects = ['ADMN', 'AE', 'AHVS', 'ANTH', 'ART', 'ASL', 'ASTR', 'ATWP', 'BCMB', 'BIOC', 'BIOL', 'BME', 'BUS', 'CD', 'CE', 'CHEM', 'CIVE', 'CNPY', 'COM', 'CS', 'CSC', 'CSPT', 'CW', 'CYC', 'DR', 'ECE', 'ECON', 'ED-D', 'ED-P', 'EDCI', 'ENGR', 'ENSH', 'ENT', 'EOS', 'EPHE', 'ER', 'ES', 'EUS', 'FA', 'FORB', 'FRAN', 'GDS', 'GEOG', 'GMST', 'GNDR', 'GREE', 'GRS', 'GS', 'HINF', 'HLTH', 'HSTR', 'HUMA', 'ICDG', 'IED', 'IGOV', 'IN', 'INDW', 'INGH', 'INTD', 'INTS', 'IS', 'ISP', 'ITAL', 'LAS', 'LATI', 'LAW', 'LING', 'MATH', 'MBA', 'MDIA', 'MECH', 'MEDI', 'MEDS', 'MGB', 'MICR', 'MUS', 'NRSC', 'NUED', 'NUHI', 'NUNP', 'NURA', 'NURS', 'PAAS', 'PHIL', 'PHSP', 'PHYS', 'POLI', 'PSYC', 'RCS', 'SCIE', 'SDH', 'SENG', 'SJS', 'SLST', 'SOCI', 'SOCW', 'SPAN', 'STAT', 'TCA', 'THEA', 'TS', 'WRIT']

if len(sys.argv) > 3:
    sys.stderr.write("TOO MANY ARGS\n")
    sys.exit(1)

# --- HEADLESS CHROME SETUP ---
chrome_options = Options()
chrome_options.add_argument("--headless=new") 
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920,1080")
# Suppress chrome logging to keep stdout clean
chrome_options.add_argument("--log-level=3") 

driver = webdriver.Chrome(options=chrome_options)

ROOT = Path(__file__).resolve().parent
scraper_file = ROOT / "Scripts" / "course_search_scraper.js"

subject = "CSC" 
course_number = ""

if len(sys.argv) >= 2:
    subject = sys.argv[1].upper()
if len(sys.argv) == 3:
    course_number = sys.argv[2]

if subject not in all_subjects:
    sys.stderr.write(f"INVALID_SUBJECT: {subject}")
    driver.quit()
    sys.exit(1)

try:
    with open(scraper_file, "r", encoding="utf-8") as f:
        scraper_js = f.read()

    driver.get("https://banner.uvic.ca/StudentRegistrationSsb/ssb/classSearch/classSearch")
    driver.execute_script("document.getElementById('classSearchLink').click();")
    
    # Select Term
    driver.execute_script("""
        $('#txt_term').val('202601').trigger('change');
        document.getElementById('term-go').click();
    """)
    time.sleep(1)

    # Input Search Criteria
    driver.execute_script(f"""
        var subjectInput = document.getElementById('txt_subject');
        subjectInput.value = '{subject}';
        subjectInput.dispatchEvent(new Event('change', {{ bubbles: true }}));

        var numInput = document.getElementById('txt_courseNumber');
        numInput.value = '{course_number}';
        numInput.dispatchEvent(new Event('change', {{ bubbles: true }}));

        document.getElementById('search-go').click();
    """)
    time.sleep(0.5)

    # Set Page Size
    driver.execute_script("$('.page-size-select').val('50').change();")
    time.sleep(0.8)

    # Inject Scraper
    setup_subject_js = f"window.targetSubject = '{subject}';"
    driver.execute_script(setup_subject_js + scraper_js)

    # Poll for completion
    while True:
        is_done = driver.execute_script("return window.scrapingFinished || false;")
        if is_done:
            break
        time.sleep(0.1)

    # Get Data
    all_data = driver.execute_script("return window.finalData;")

    # --- KEY CHANGE: Print JSON to Stdout instead of saving to file ---
    print(json.dumps(all_data))
    
    # Write logs to stderr so they don't break the JSON parsing
    sys.stderr.write(f"Scraped {len(all_data)} courses successfully.\n")

finally:
    driver.quit()