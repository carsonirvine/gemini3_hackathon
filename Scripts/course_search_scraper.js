let allCourses = [];
let pageCount = 0;
let targetSubject = window.targetSubject;


function scrapeCurrentPage() {
    let rows = document.querySelectorAll('tr[data-id]');

    // Wait for rows to exist
    if (rows.length === 0) {
        setTimeout(scrapeCurrentPage, 1000);
        return;
    }

    rows.forEach(row => {
        let getProp = (prop) => row.querySelector(`[data-property="${prop}"]`)?.innerText.trim() || "N/A";
            
        let scheduleRaw = row.querySelector('[data-property="meetingTime"]')?.getAttribute('title') || "TBA";
            
        allCourses.push({
            crn: getProp("courseReferenceNumber"),
            subject: getProp("subject"),
            course: getProp("courseNumber"),
            section: getProp("sequenceNumber"),
            title: getProp("courseTitle"),
            schedule: scheduleRaw.split("SMTWTFS")[0].trim() + " | " + 
                        (scheduleRaw.split("SMTWTFS")[1]?.split("Building:")[0].trim() || "")
        });
    });

    let nextButton = document.querySelector('button.paging-control.next');
    if (nextButton && !nextButton.disabled && nextButton.getAttribute('aria-disabled') !== 'true') {
        nextButton.click();
        setTimeout(scrapeCurrentPage, 800);
    } else {
        finishScrape();
    }
}

function finishScrape() {
    window.finalData = allCourses;
    window.scrapingFinished = true; // THIS RELEASES THE PYTHON LOOP
    console.log("Scraping finished.");
}

// Start immediately when injected
scrapeCurrentPage();