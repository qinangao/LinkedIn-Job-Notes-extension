console.log("[LinkedIn Job Notes] Script loaded on:", window.location.href);

const observer = new MutationObserver(() => {
  checkAndDisplayBadges();
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial check with delays for page load
setTimeout(checkAndDisplayBadges, 1000);
setTimeout(checkAndDisplayBadges, 3000);

// Listen for storage changes to update badges when notes are added/deleted
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    console.log("Storage changed, updating badges");
    checkAndDisplayBadges();
  }
});

function checkAndDisplayBadges() {
  const jobListItems = document.querySelectorAll(
    "li.scaffold-layout__list-item"
  );

  if (jobListItems.length === 0) {
    console.log("No job list items found");
    return;
  }

  jobListItems.forEach((listItem) => {
    // Skip empty placeholder items
    const jobContainer = listItem.querySelector(".job-card-container");
    if (!jobContainer) return;

    // Get job ID from data attribute
    const jobId = jobContainer.getAttribute("data-job-id");
    if (!jobId) return;

    // Find the job title link
    const titleLink = listItem.querySelector("a.job-card-list__title--link");
    if (!titleLink) return;

    const storageKey = `job_${jobId}`;

    // Check if note exists for this job
    chrome.storage.local.get([storageKey], (result) => {
      const existingBadge = titleLink.querySelector(".job-note-badge");

      if (result[storageKey]) {
        // Note exists - show badge if not already there
        if (!existingBadge) {
          displayBadge(titleLink, result[storageKey]);
        } else {
          // Update badge tooltip in case note changed
          existingBadge.title = `Note: ${result[storageKey]}`;
        }
      } else {
        // No note - remove badge if it exists
        if (existingBadge) {
          existingBadge.remove();
        }
      }
    });
  });
}

function displayBadge(titleLink, noteText) {
  // Create badge indicator
  const badge = document.createElement("span");
  badge.className = "job-note-badge";
  badge.textContent = "📝";
  badge.title = `Note: ${noteText}`;

  // Find the title container with the <strong> tag
  const titleStrong = titleLink.querySelector("strong");
  if (titleStrong) {
    // Insert badge right after the strong tag, inside the link
    titleStrong.parentNode.insertBefore(badge, titleStrong.nextSibling);
  } else {
    // Fallback: insert after the link
    titleLink.parentNode.insertBefore(badge, titleLink.nextSibling);
  }
}
