(function() {
    // Reset state in case this script runs multiple times in one session
    window.allCourses = window.allCourses || [];
    window.scrapingFinished = false;
    window.finalData = [];

    let targetSubject = window.targetSubject;
    let targetNumber = window.targetNumber;
    let retryCount = 0;

    function scrapeCurrentPage() {
        // Look specifically for the rows containing course data
        let rows = document.querySelectorAll('tr[data-id]');

        // If no rows found, wait a bit for the table to render
        if (rows.length === 0 && retryCount < 10) {
            retryCount++;
            setTimeout(scrapeCurrentPage, 500);
            return;
        }

        rows.forEach(row => {
            let getProp = (p) => row.querySelector(`[data-property="${p}"]`)?.innerText.trim() || "N/A";
            
            // Filter by subject and number (e.g., CSC 111)
            if (getProp("subject") === targetSubject && getProp("courseNumber") === targetNumber) {
                let scheduleRaw = row.querySelector('[data-property="meetingTime"]')?.getAttribute('title') || "TBA";
                let statusCell = row.querySelector('td[data-property="status"]');
                let seats = "N/A", wait = "N/A";

                if (statusCell) {
                    let titleText = statusCell.getAttribute('title') || "";
                    let matches = [...titleText.matchAll(/(\d+)\s+of\s+(\d+)/g)];
                    if (matches[0]) seats = `${matches[0][1]}/${matches[0][2]}`;
                    if (matches[1]) wait = `${matches[1][1]}/${matches[1][2]}`;
                }

                window.allCourses.push({
                    crn: getProp("courseReferenceNumber"),
                    subject: getProp("subject"),
                    course: getProp("courseNumber"),
                    section: getProp("sequenceNumber"),
                    title: getProp("courseTitle"),
                    seats: seats,
                    waitlist: wait,
                    schedule: scheduleRaw.split("SMTWTFS")[0].trim() + " | " + 
                            (scheduleRaw.split("SMTWTFS")[1]?.split("Building:")[0].trim() || "TBA")
                });
            }
        });

        // Check for the "Next" page button
        let nextBtn = document.querySelector('button.paging-control.next');
        let isLastPage = !nextBtn || 
                         nextBtn.disabled || 
                         nextBtn.getAttribute('aria-disabled') === 'true' || 
                         nextBtn.classList.contains('disabled');

        if (!isLastPage) {
            nextBtn.click();
            // Wait for the table to refresh after clicking next
            setTimeout(scrapeCurrentPage, 1000);
        } else {
            // DONE: Pass the data back to Python
            window.finalData = window.allCourses;
            window.scrapingFinished = true;
        }
    }

    scrapeCurrentPage();
})();