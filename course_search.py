
import json
import time
import course_lookup as lookup
from selenium import webdriver
from pathlib import Path
import sys

# for timing
start_time = time.time()

if len(sys.argv)>2:
    print("TOO MANY ARGS, only 1 additional")
    sys.exit()

# for headless (no GUI) script
from selenium.webdriver.chrome.options import Options
chrome_options = Options()
chrome_options.add_argument("--headless=new") # The "new" flag is the modern version
chrome_options.add_argument("--disable-gpu")  # Recommended for stability in headless
chrome_options.add_argument("--window-size=1920,1080") # High resolution prevents layout shifts
driver = webdriver.Chrome(options=chrome_options)

# for run with GUI showing up
# driver = webdriver.Chrome()

ROOT = Path(__file__).resolve().parent
scraper_file = ROOT / "scripts" / "course_search_scraper.js"

subject = "CSC"

if len(sys.argv) == 2:
    subject = sys.argv[1] 

try:
    with open(scraper_file, "r", encoding="utf-8") as f:
        scraper_js = f.read()

    driver.get("https://banner.uvic.ca/StudentRegistrationSsb/ssb/classSearch/classSearch")
    driver.execute_script("document.getElementById('classSearchLink').click();")
    driver.execute_script("""
        $('#txt_term').val('202601').trigger('change');
        document.getElementById('term-go').click();
    """)
    time.sleep(1)
    driver.execute_script(f"""
        var hiddenInput = document.getElementById('txt_subject');
        hiddenInput.value = '{subject}';
        var event = new Event('change', {{ bubbles: true }});
        hiddenInput.dispatchEvent(event);
        document.getElementById('search-go').click();
    """)
    time.sleep(0.5)
    driver.execute_script("""
        $('.page-size-select').val('50').change();
    """)
    time.sleep(0.8)

    setup_subject_js = f"window.targetSubject = '{subject}';"
    driver.execute_script(setup_subject_js + scraper_js)

    # 3. POLLING LOOP: Wait for JS to finish
    while True:
        # Check if our global flag is set to true
        is_done = driver.execute_script("return window.scrapingFinished || false;")
        if is_done:
            break
        time.sleep(0.1) # Wait 1 seconds before checking again

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

    print(f"Success! Saved {len(all_data)} courses to {output_filename}")
    print(f"Process took {time.time() - start_time:.2f} seconds")
finally:
    driver.quit()
    pass
