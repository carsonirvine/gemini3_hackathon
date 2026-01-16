import json
import time
from selenium import webdriver
from pathlib import Path

ROOT = Path(__file__).resolve().parent
scraper_file = ROOT / "scripts" / "specific_scraper.js"
# get_to_search_results_file = ROOT / "scripts" / "get_to_search_results.js"


# 1. Setup Driver
driver = webdriver.Chrome()

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
    time.sleep(1)
    driver.execute_script("""
        $('.page-size-select').val('50').change();
    """)

    # time.sleep(30) # Give yourself time to click "Search"

    print("Injecting Scraper...")
    driver.execute_script(scraper_js)

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