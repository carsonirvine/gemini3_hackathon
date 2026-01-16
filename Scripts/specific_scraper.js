let allCourses = [];
let pageCount = 0;

function scrapeCurrentPage() {
    pageCount++;
    console.log(`Scraping Page ${pageCount}...`);

    let rows = document.querySelectorAll('tr[data-id]');
    rows.forEach(row => {
        let getProp = (prop) => row.querySelector(`[data-property="${prop}"]`)?.innerText.trim() || "";
        
        let subject = getProp("subject").toUpperCase(); // Convert to uppercase

        // More flexible check: see if "ANTH" exists anywhere in the subject string
        if (subject.includes("ANTH")) {
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

    let nextButton = document.querySelector('button.paging-control.next');

    // Increased page limit to 100 to ensure we find it alphabetically
    if (nextButton && !nextButton.disabled && nextButton.getAttribute('aria-disabled') !== 'true' && pageCount < 100) {
        nextButton.click();
        setTimeout(scrapeCurrentPage, 3000);
    } else {
        console.log("Finished! Total ANTH courses found:", allCourses.length);
        copy(JSON.stringify(allCourses, null, 2));
    }
}

scrapeCurrentPage();