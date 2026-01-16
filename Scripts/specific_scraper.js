let allCourses = [];
let pageCount = 0;
let foundAnyInThisSession = false; // Track if we've started finding ANTH
let targetSubject = window.targetSubject;


function scrapeCurrentPage() {
    let rows = document.querySelectorAll('tr[data-id]');
    let foundOnThisPage = 0;

    // Wait for rows to exist
    if (rows.length === 0) {
        setTimeout(scrapeCurrentPage, 1000);
        return;
    }

    rows.forEach(row => {
        let getProp = (prop) => row.querySelector(`[data-property="${prop}"]`)?.innerText.trim() || "N/A";
        let subject = getProp("subject");

        if (subject === targetSubject) {
            foundOnThisPage++;
            foundAnyInThisSession = true; 
            let scheduleRaw = row.querySelector('[data-property="meetingTime"]')?.getAttribute('title') || "TBA";
            
            allCourses.push({
                crn: getProp("courseReferenceNumber"),
                subject: subject,
                course: getProp("courseNumber"),
                section: getProp("sequenceNumber"),
                title: getProp("courseTitle"),
                schedule: scheduleRaw.split("SMTWTFS")[0].trim() + " | " + 
                          (scheduleRaw.split("SMTWTFS")[1]?.split("Building:")[0].trim() || "")
            });
        }
    });

    // Stop if we found the subject and now it's gone
    if (foundAnyInThisSession && foundOnThisPage === 0) {
        finishScrape();
        return;
    }

    let nextButton = document.querySelector('button.paging-control.next');
    if (nextButton && !nextButton.disabled && nextButton.getAttribute('aria-disabled') !== 'true') {
        nextButton.click();
        setTimeout(scrapeCurrentPage, 1500);
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