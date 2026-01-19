import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def get_uvic_courses(subject: str, number: str):
    ROOT = Path(__file__).resolve().parent
    # FIX: Ensure this path matches your folder structure exactly
    scraper_file = ROOT / "scripts" / "scraper.js"

    chrome_options = Options()
    chrome_options.add_argument("--headless=new") # Re-enable for speed
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        if not scraper_file.exists(): return []
        with open(scraper_file, "r", encoding="utf-8") as f:
            scraper_js = f.read()

        driver.get("https://banner.uvic.ca/StudentRegistrationSsb/ssb/classSearch/classSearch")
        driver.execute_script("document.getElementById('classSearchLink').click();")
        time.sleep(1) 
        
        driver.execute_script("""
            $('#txt_term').val('202601').trigger('change');
            $('#term-go').click();
        """)
        time.sleep(2) 

        driver.execute_script(f"""
            var $sub = $('#txt_subject');
            if ($sub.length) $sub.append(new Option('{subject}', '{subject}', true, true)).trigger('change');
            $('#txt_courseNumber').val('{number}').trigger('change');
            setTimeout(() => {{ $('#search-go').click(); }}, 200);
        """)
        
        time.sleep(3) 

        # Set page size to 50 to see all sections
        driver.execute_script("if($('.page-size-select').length) $('.page-size-select').val('50').change();")
        time.sleep(1.5)

        setup_vars_js = f"window.targetSubject = '{subject}'; window.targetNumber = '{number}';"
        driver.execute_script(setup_vars_js + scraper_js)

        # Poll for completion
        for _ in range(40):
            if driver.execute_script("return window.scrapingFinished || false;"): break
            time.sleep(0.5)

        return driver.execute_script("return window.finalData;")
    except Exception as e:
        print(f"Error: {e}")
        return []
    finally:
        driver.quit()