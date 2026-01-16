import json
import time
import course_lookup as lookup
from selenium import webdriver
from pathlib import Path

import sys

if len(sys.argv)>2:
    print("TOO MANY ARGS, only 1 additional")
    sys.exit()

ROOT = Path(__file__).resolve().parent
scraper_file = ROOT / "scripts" / "specific_scraper.js"
# get_to_search_results_file = ROOT / "scripts" / "get_to_search_results.js"

subject = "CSC"

# 1. Setup Driver
driver = webdriver.Chrome()
if len(sys.argv) == 2:
    subject = sys.argv[1] 


starting_page = lookup.lookup(subject)

try:
    # 2. Load and Run Script
    with open(scraper_file, "r", encoding="utf-8") as f:
        scraper_js = f.read()
    
    # with open(get_to_search_results_file, "r", encoding="utf-8") as f:
    #     nav_js = f.read()

    # NOTE: You must manually navigate to the search RESULTS page first, 
    # or add logic here to perform the search.
    driver.get("https://banner.uvic.ca/StudentRegistrationSsb/ssb/classSearch/classSearch")
    
    print("Injecting Nav...")
    driver.execute_script("document.getElementById('classSearchLink').click();")
    # time.sleep(1)
    driver.execute_script("""
        $('#txt_term').val('202601').trigger('change');
        document.getElementById('term-go').click();
    """)
    time.sleep(0.5)
    driver.execute_script("document.getElementById('search-go').click();")
    time.sleep(0.5)
    driver.execute_script("""
        $('.page-size-select').val('50').change();
    """)
    time.sleep(0.5)
    print(f"Navigating to page {starting_page}...")

    # 1. Set the page number
    # 2. Trigger the change event
    # 3. Simulate the 'Enter' key (keyCode 13)
    driver.execute_script(f"""
        var pg = $('.page-number');
        pg.val('{starting_page}').change();
        var e = $.Event('keydown');
        e.which = 13; 
        e.keyCode = 13;
        pg.trigger(e);
    """)

    # IMPORTANT: Wait for the network to fetch the new page data 
    # before you inject the scraper to start reading rows.
    time.sleep(1)

    # time.sleep(30) # Give yourself time to click "Search"

    print("Injecting Scraper...")
    setup_subject_js = f"window.targetSubject = '{subject}';"
    driver.execute_script(setup_subject_js + scraper_js)

    # 3. POLLING LOOP: Wait for JS to finish
    print(f"Scraping pages... (Checking for {subject} courses)")
    while True:
        # Check if our global flag is set to true
        is_done = driver.execute_script("return window.scrapingFinished || false;")
        if is_done:
            break
        time.sleep(1) # Wait 2 seconds before checking again

    # 4. Get Data and Save
    all_data = driver.execute_script("return window.finalData;")

    # Define the subfolder (e.g., "Data")
    output_dir = ROOT / "JSON_output"

    # Create the folder automatically if it doesn't exist yet
    output_dir.mkdir(parents=True, exist_ok=True)

    output_filename = f"{subject}_courses.json"
    output_path = output_dir / output_filename

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=4)

    print(f"Success! Saved {len(all_data)} courses to {output_path}")
finally:
    driver.quit() # Keep open to inspect, or uncomment to auto-close
    pass
