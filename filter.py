import json
import time
from selenium import webdriver
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRAPER_FILE = ROOT / "scripts" / "specific_scraper.js"

# 1. Setup Driver
driver = webdriver.Chrome()

try:
    # 2. Load and Run Script
    with open(SCRAPER_FILE, "r", encoding="utf-8") as f:
        js_content = f.read()

    # NOTE: You must manually navigate to the search RESULTS page first, 
    # or add logic here to perform the search.
    driver.get("https://banner.uvic.ca/StudentRegistrationSsb/ssb/classSearch/classSearch")
    
    print("Please perform your search in the browser now. Script will wait 10s...")
    time.sleep(15) # Give yourself time to click "Search"

    print("Injecting Scraper...")
    driver.execute_script(js_content)

    # 3. POLLING LOOP: Wait for JS to finish
    print("Scraping pages... (Checking for ANTH courses)")
    while True:
        # Check if our global flag is set to true
        is_done = driver.execute_script("return window.scrapingFinished || false;")
        if is_done:
            break
        time.sleep(2) # Wait 2 seconds before checking again

    # 4. Get Data and Save
    all_data = driver.execute_script("return window.finalData;")
    
    output_path = ROOT / "anth_courses.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=4)

    print(f"Success! Saved {len(all_data)} courses to {output_path}")

finally:
    # driver.quit() # Keep open to inspect, or uncomment to auto-close
    pass