let allCourses = [];
let pageCount = 0;

function scrapeCurrentPage() {
    pageCount++;
    console.log(`Scraping Page ${pageCount}...`);

    let rows = document.querySelectorAll('tr[data-id]');
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
                    (scheduleRaw.split("SMTWTFS")[1]?.split("Building:")[0].trim() || ""),
            page: pageCount
        });
        
    });

    // Find the 'Next' arrow button
    let nextButton = document.querySelector('button.paging-control.next');

    if (nextButton && !nextButton.disabled && nextButton.getAttribute('aria-disabled') !== 'true') {
        nextButton.click();
        // Wait 3 seconds for the next page to load before scraping again
        setTimeout(scrapeCurrentPage, 3000);
    } else {
        console.log("Finished! Total courses scraped:", allCourses.length);
        copy(JSON.stringify(allCourses, null, 2));
        console.log("Data copied to clipboard as JSON.");
    }
}

// Start the process
scrapeCurrentPage();