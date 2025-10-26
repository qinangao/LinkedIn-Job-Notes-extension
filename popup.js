const addNoteBtn = document.getElementById("add-note-btn");
const viewNotesBtn = document.getElementById("view-notes-btn");
const noteInput = document.getElementById("note-input");
const notesContainer = document.getElementById("notes-container");
const form = document.querySelector("form");

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
      alert(`Note saved for job ID: ${jobId}!\n\nNote: "${note}"`);

      // Auto-refresh the notes list if it's open
      if (notesContainer.innerHTML !== "") {
        viewNotesBtn.click();
      }
    });
  });
}

// View all saved notes
viewNotesBtn.addEventListener("click", () => {
  chrome.storage.local.get(null, (items) => {
    const jobNotes = [];

    // Filter and organize notes
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
      return;
    }

    // Sort by most recent (assuming higher job IDs are newer)
    jobNotes.sort((a, b) => {
      const idA = parseInt(a.id.replace("job_", ""));
      const idB = parseInt(b.id.replace("job_", ""));
      return idB - idA;
    });

    // Display notes
    let html = '<div class="notes-list">';
    jobNotes.forEach((job) => {
      html += `
        <div class="note-item">
          <div class="note-header">
            <strong>${escapeHtml(job.title)}</strong>
          </div>
          <div class="note-content">${escapeHtml(job.note)}</div>
          <div class="note-actions">
            ${
              job.url
                ? `<a href="${escapeHtml(
                    job.url
                  )}" target="_blank">View Job</a>`
                : ""
            }
            <button class="delete-btn" data-key="${escapeHtml(
              job.id
            )}">Delete</button>
          </div>
        </div>
      `;
    });
    html += "</div>";

    notesContainer.innerHTML = html;

    // Add delete handlers
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const key = e.target.getAttribute("data-key");
        if (confirm("Delete this note?")) {
          chrome.storage.local.remove(
            [key, `${key}_title`, `${key}_url`],
            () => {
              viewNotesBtn.click();
            }
          );
        }
      });
    });
  });
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Auto-load notes on popup open
window.addEventListener("load", () => {
  // Check if we're on a job page and show helpful message
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    if (currentUrl.includes("linkedin.com/jobs")) {
      const jobId =
        currentUrl.match(/\/jobs\/view\/(\d+)/) ||
        currentUrl.match(/currentJobId=(\d+)/);
      if (jobId) {
        const storageKey = `job_${jobId[1]}`;
        chrome.storage.local.get([storageKey], (result) => {
          if (result[storageKey]) {
            noteInput.placeholder = `Current note: "${result[storageKey]}"`;
          }
        });
      }
    }
  });
});
