let allCourses = [];
let pageCount = 0;
let foundAnyInThisSession = false; // Track if we've started finding ANTH

function scrapeCurrentPage() {
    pageCount++;
    console.log(`Scraping Page ${pageCount}...`);

    let rows = document.querySelectorAll('tr[data-id]');
    let foundOnThisPage = 0;

    rows.forEach(row => {
        let getProp = (prop) => row.querySelector(`[data-property="${prop}"]`)?.innerText.trim() || "N/A";
        let subject = getProp("subject");

        if (subject === "ANTH") {
            foundOnThisPage++;
            foundAnyInThisSession = true; // Mark that we are officially in the ANTH section
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

    // --- TERMINATION LOGIC ---
    // If we were previously finding ANTH courses, but this page has none, we are done!
    if (foundAnyInThisSession && foundOnThisPage === 0) {
        console.log("Detected end of ANTH section. Terminating early...");
        finishScrape();
        return;
    }

    let nextButton = document.querySelector('button.paging-control.next');
    
    // Continue if there's a next page and we haven't hit the end of the ANTH block
    if (nextButton && !nextButton.disabled && nextButton.getAttribute('aria-disabled') !== 'true') {
        nextButton.click();
        setTimeout(scrapeCurrentPage, 3000);
    } else {
        finishScrape();
    }
}

function finishScrape() {
    console.log("Finished! Total ANTH courses found:", allCourses.length);
    // copy(JSON.stringify(allCourses, null, 2));
    // console.log("ANTH data copied to clipboard.");
    window.scrapingFinished = true;
    window.finalData = allCourses;
}

scrapeCurrentPage();