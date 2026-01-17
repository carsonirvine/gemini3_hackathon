let allCourses = [];
let pageCount = 0;

function scrapeCurrentPage() {
    pageCount++;
    console.log(`Scraping Page ${pageCount}...`);


    

    let rows = document.querySelectorAll('tr[data-id]');
    rows.forEach(row => {
        let getProp = (prop) => row.querySelector(`[data-property="${prop}"]`)?.innerText.trim() || "N/A";
        let scheduleRaw = row.querySelector('[data-property="meetingTime"]')?.getAttribute('title') || "TBA";

        let statusCell = row.querySelector('td[data-property="status"]');
            let seatsFraction = "N/A";
            let waitlistFraction = "N/A";

            if (statusCell) {
                let statusText = statusCell.getAttribute('title') || statusCell.innerText;
                
                // Regex explanation: 
                // (\d+) matches the first number (remaining)
                // \s+of\s+ matches " of "
                // (\d+) matches the second number (total)
                let matches = [...statusText.matchAll(/(\d+)\s+of\s+(\d+)/g)];

                if (matches.length >= 1) {
                    // First match is always seats: e.g., "0", "24"
                    seatsFraction = `${matches[0][1]}/${matches[0][2]}`;
                }
                if (matches.length >= 2) {
                    // Second match is always waitlist: e.g., "13", "20"
                    waitlistFraction = `${matches[1][1]}/${matches[1][2]}`;
                }
            }

        allCourses.push({
            crn: getProp("courseReferenceNumber"),
            subject: getProp("subject"),
            course: getProp("courseNumber"),
            section: getProp("sequenceNumber"),
            title: getProp("courseTitle"),
            instructionalMethod: getProp("instructionalMethod"),
            seats: seatsFraction,
            campus: getProp("campus"),
            waitlist: waitlistFraction,
            schedule: scheduleRaw.split("SMTWTFS")[0].trim() + " | " + 
                        (scheduleRaw.split("SMTWTFS")[1]?.split("Building:")[0].trim() || "")
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