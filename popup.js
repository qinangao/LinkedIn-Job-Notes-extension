const addNoteBtn = document.getElementById("add-note-btn");
const viewNotesBtn = document.getElementById("view-notes-btn");
const noteInput = document.getElementById("note-input");
const notesContainer = document.getElementById("notes-container");
const form = document.querySelector("form");
const linkedinContent = document.getElementById("linkedin-content");
const nonLinkedinContent = document.getElementById("non-linkedin-content");

// Function to check if current tab is on LinkedIn
function isLinkedInPage(url) {
  return url && url.includes("linkedin.com");
}

// Function to toggle UI based on current page
function toggleUI(isLinkedIn) {
  if (isLinkedIn) {
    linkedinContent.style.display = "block";
    nonLinkedinContent.style.display = "none";
  } else {
    linkedinContent.style.display = "none";
    nonLinkedinContent.style.display = "block";
  }
}

// Check current page and update UI when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentUrl = tabs[0].url;
  const isLinkedIn = isLinkedInPage(currentUrl);
  toggleUI(isLinkedIn);
});

// Prevent form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  addNote();
});

// Add note button
addNoteBtn.addEventListener("click", addNote);

function addNote() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;

    if (!currentUrl.includes("linkedin.com/jobs")) {
      alert("Please navigate to a LinkedIn job page to add a note.");
      return;
    }

    const note = noteInput.value.trim();
    if (!note) {
      alert("Please enter a note.");
      return;
    }

    // Extract job ID from URL - try multiple patterns
    let jobId = null;

    // Pattern 1: /jobs/view/4331339362/
    const viewMatch = currentUrl.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) {
      jobId = viewMatch[1];
    }

    // Pattern 2: currentJobId=4331339362
    if (!jobId) {
      const paramMatch = currentUrl.match(/currentJobId=(\d+)/);
      if (paramMatch) {
        jobId = paramMatch[1];
      }
    }

    if (!jobId) {
      alert(
        "Could not identify job ID from this page. Make sure you are viewing a specific job."
      );
      return;
    }

    const storageKey = `job_${jobId}`;
    const data = {
      [storageKey]: note,
      [`${storageKey}_title`]: tabs[0].title.replace(" | LinkedIn", ""),
      [`${storageKey}_url`]: currentUrl,
    };

    chrome.storage.local.set(data, () => {
      noteInput.value = "";
      // alert(`Note saved for job ID: ${jobId}!\n\nNote: "${note}"`);

      // Auto-refresh the notes list if it's open
      if (notesContainer.innerHTML !== "") {
        viewNotesBtn.click();
      }
    });
  });
}

// View all saved notes
// View all saved notes (toggle open/close)
viewNotesBtn.addEventListener("click", () => {
  // If notes are currently visible, hide them
  if (notesContainer.style.display === "block") {
    notesContainer.style.display = "none";
    viewNotesBtn.textContent = "View All Saved Notes";
    return;
  }

  // Otherwise, show notes
  chrome.storage.local.get(null, (items) => {
    const jobNotes = [];

    Object.keys(items).forEach((key) => {
      if (
        key.startsWith("job_") &&
        !key.endsWith("_title") &&
        !key.endsWith("_url")
      ) {
        jobNotes.push({
          id: key,
          note: items[key],
          title: items[`${key}_title`] || "Unknown Job",
          url: items[`${key}_url`] || "",
        });
      }
    });

    if (jobNotes.length === 0) {
      notesContainer.innerHTML =
        '<p class="no-notes">No notes saved yet.<br><br>Navigate to a LinkedIn job and add a note using the form above!</p>';
    } else {
      jobNotes.sort((a, b) => {
        const idA = parseInt(a.id.replace("job_", ""));
        const idB = parseInt(b.id.replace("job_", ""));
        return idB - idA;
      });

      let html = '<div class="notes-list">';
      jobNotes.forEach((job) => {
        html += `
          <div class="note-item">
            <div class="note-header"><strong>${escapeHtml(
              job.title
            )}</strong></div>
            <div class="note-content">${escapeHtml(job.note)}</div>
            <div class="note-actions">
              ${
                job.url
                  ? `<a href="${escapeHtml(
                      job.url
                    )}" target="_blank">View Job</a>`
                  : ""
              }
              <button class="button delete-btn" data-key="${escapeHtml(
                job.id
              )}">Delete</button>
            </div>
          </div>
        `;
      });
      html += "</div>";
      notesContainer.innerHTML = html;
    }

    // Add delete handlers
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.target.getAttribute("data-key");
        if (confirm("Delete this note?")) {
          chrome.storage.local.remove(
            [key, `${key}_title`, `${key}_url`],
            () => {
              viewNotesBtn.click(); // Refresh notes
            }
          );
        }
      });
    });

    // Finally, show the container
    notesContainer.style.display = "block";
    viewNotesBtn.textContent = "Hide Notes";
  });
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Auto-load notes on popup open
window.addEventListener("load", () => {
  // Check current page and update UI
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    const isLinkedIn = isLinkedInPage(currentUrl);
    toggleUI(isLinkedIn);
  });
});
