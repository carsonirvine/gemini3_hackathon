(function() {
    let allCourses = [];
    let targetSubject = window.targetSubject;
    let targetNumber = window.targetNumber;
    let retryCount = 0;

    function scrapeCurrentPage() {
        let rows = document.querySelectorAll('tr[data-id]');

        if (rows.length === 0 && retryCount < 5) {
            retryCount++;
            setTimeout(scrapeCurrentPage, 1000);
            return;
        }

        rows.forEach(row => {
            let getProp = (p) => row.querySelector(`[data-property="${p}"]`)?.innerText.trim() || "N/A";
            
            if (getProp("subject") === targetSubject && getProp("courseNumber") === targetNumber) {
                let scheduleRaw = row.querySelector('[data-property="meetingTime"]')?.getAttribute('title') || "TBA";
                let statusCell = row.querySelector('td[data-property="status"]');
                let seats = "N/A", wait = "N/A";

                if (statusCell) {
                    let matches = [...(statusCell.getAttribute('title') || "").matchAll(/(\d+)\s+of\s+(\d+)/g)];
                    if (matches[0]) seats = `${matches[0][1]}/${matches[0][2]}`;
                    if (matches[1]) wait = `${matches[1][1]}/${matches[1][2]}`;
                }

                allCourses.push({
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

        let nextBtn = document.querySelector('button.paging-control.next');
        if (nextBtn && !nextBtn.disabled && nextBtn.getAttribute('aria-disabled') !== 'true' && nextBtn.offsetParent !== null) {
            nextBtn.click();
            setTimeout(scrapeCurrentPage, 1200);
        } else {
            window.finalData = allCourses;
            window.scrapingFinished = true;
        }
    }
    scrapeCurrentPage();
})();