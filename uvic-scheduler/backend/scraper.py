import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def get_uvic_courses(subject: str):
    # 1. Setup Paths
    # We assume 'Scripts' folder is inside 'backend' next to this file
    ROOT = Path(__file__).resolve().parent
    scraper_file = ROOT / "scripts" / "scraper.js"

    # Quick check to ensure the JS file exists before starting Chrome
    if not scraper_file.exists():
        print(f"ERROR: Could not find JS file at {scraper_file}")
        return []

    # 2. Setup Headless Chrome
    chrome_options = Options()
    chrome_options.add_argument("--headless=new") 
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Load the custom JavaScript logic
        with open(scraper_file, "r", encoding="utf-8") as f:
            scraper_js = f.read()

        # 3. Navigate to Banner
        driver.get("https://banner.uvic.ca/StudentRegistrationSsb/ssb/classSearch/classSearch")
        
        # --- Clicky Logic ---
        driver.execute_script("document.getElementById('classSearchLink').click();")
        driver.execute_script("""
            $('#txt_term').val('202601').trigger('change');
            document.getElementById('term-go').click();
        """)
        time.sleep(1) # Wait for term selection to process

        # Input the subject
        driver.execute_script(f"""
            var hiddenInput = document.getElementById('txt_subject');
            hiddenInput.value = '{subject}';
            var event = new Event('change', {{ bubbles: true }});
            hiddenInput.dispatchEvent(event);
            document.getElementById('search-go').click();
        """)
        time.sleep(0.5) 

        # Set page size to 50
        driver.execute_script("$('.page-size-select').val('50').change();")
        time.sleep(0.8) # Wait for table reload

        # 4. INJECT YOUR SCRAPER (The important part!)
        # Pass the subject to JS, then run the scraper code
        setup_subject_js = f"window.targetSubject = '{subject}';"
        driver.execute_script(setup_subject_js + scraper_js)

        # 5. POLLING LOOP: Wait for JS to tell us it's done
        # We wait up to 20 seconds, checking every 0.5s
        max_retries = 40 
        for _ in range(max_retries):
            is_done = driver.execute_script("return window.scrapingFinished || false;")
            if is_done:
                break
            time.sleep(0.5)
        else:
            # If the loop finishes without breaking, we timed out
            print(f"Timeout waiting for scraper on {subject}")
            return []

        # 6. Retrieve the final data
        final_data = driver.execute_script("return window.finalData;")
        
        # Return the list of courses (FastAPI will turn this into JSON automatically)
        return final_data

    except Exception as e:
        print(f"Scraping Error: {e}")
        return []
    finally:
        driver.quit()