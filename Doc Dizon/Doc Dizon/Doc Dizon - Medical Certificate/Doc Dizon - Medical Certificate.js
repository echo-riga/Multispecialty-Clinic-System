const input = document.getElementById("certify-age");

input.addEventListener("input", function () {
  if (this.value.length > 3) {
    this.value = this.value.slice(0, 3); // keep only first 3 digits
  }
});

function printPrescription() {
  // Create a new window for printing without URL
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback to regular print if popup blocked
    window.print();
    return;
  }

  // Get the current document content
  const currentContent = document.documentElement.outerHTML;

  // Create clean HTML without URL parameters
  const cleanHtml = currentContent.replace(/\?[^"]*/g, '');

  // Write clean content to new window
  printWindow.document.write(cleanHtml);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
}

function clearBtn() {
  // Clear all input fields
  document.querySelectorAll("input").forEach(input => {
    input.value = "";
  });

  // Clear all textarea fields
  document.querySelectorAll("textarea").forEach(textarea => {
    textarea.value = "";
  });

  // Clear all editable spans (if any)
  document.querySelectorAll(".editable-line").forEach(span => {
    span.textContent = "";
  });
}

// Function to load doctor information from the API
async function loadDoctorInfo() {
  try {
    // Get auth headers from localStorage
    const raw = localStorage.getItem('authUser');
    if (!raw) {
      console.warn('No auth user found, using default doctor info');
      return;
    }

    const { username, role } = JSON.parse(raw);
    if (role !== 'doctor') {
      console.warn('User is not a doctor, using default doctor info');
      return;
    }

    // Fetch doctor profile
    const response = await fetch('/api/doctors/me', {
      headers: {
        'X-User': username,
        'X-Role': role
      }
    });

    if (!response.ok) {
      console.warn('Failed to fetch doctor profile, using default doctor info');
      return;
    }

    const doctorProfile = await response.json();

    // Update the doctor name and license in the footer
    const doctorNameEl = document.getElementById('doctor-name');
    const licenseEl = document.getElementById('doctor-license');

    if (doctorNameEl && doctorProfile.fullName) {
      let displayName = doctorProfile.fullName;
      if (doctorProfile.abbreviations) {
        displayName += ` ${doctorProfile.abbreviations}`;
      }
      doctorNameEl.textContent = displayName;
    }

    if (licenseEl && doctorProfile.licenseNumber) {
      licenseEl.textContent = `License No. ${doctorProfile.licenseNumber}`;
    }

  } catch (error) {
    console.warn('Error loading doctor info:', error);
    // Keep default doctor info if there's an error
  }
}

// Set today's date by default
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("date").value = new Date()
    .toISOString()
    .split("T")[0];

  // Load doctor information
  loadDoctorInfo();
  try {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || '';
    const sex = params.get('sex') || '';
    const address = params.get('address') || '';
    const dob = params.get('dob') || '';
    const reason = params.get('for') || params.get('reason') || params.get('notes') || params.get('diagnosis') || params.get('diag') || '';

    const nameEl = document.getElementById('certify-name');
    if (nameEl && name) nameEl.value = name;

    const sexEl = document.getElementById('certify-sex');
    if (sexEl && sex) sexEl.value = sex;

    const addrEl = document.getElementById('certify-address1');
    if (addrEl && address) addrEl.value = address;

    const dateFromEl = document.getElementById('certify-datefrom');
    if (dateFromEl) {
      dateFromEl.value = new Date().toISOString().split('T')[0];
    }

    const forEl = document.getElementById('certify-for');
    if (forEl && reason) forEl.value = reason;

    const assessment = params.get('assessment') || '';
    const recommendations = params.get('recommendations') || '';

    // Fill assessment/impression fields (only first field)
    const assessment1El = document.getElementById('assessment1');
    if (assessment1El && assessment) assessment1El.value = assessment;

    // Fill recommendations fields (only first field)
    const recommendation1El = document.getElementById('recommendation1');
    if (recommendation1El && recommendations) recommendation1El.value = recommendations;

    const ageEl = document.getElementById('certify-age');
    if (ageEl && dob) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
        if (age >= 0 && age <= 150) ageEl.value = String(age);
      }
    }
    // Autoprint if requested
    const autoprint = params.get('autoprint');
    if (autoprint === '1') {
      // Check if we're in an iframe (for direct printing without new tab)
      if (window.self !== window.top) {
        // We're in an iframe, print directly
        setTimeout(() => {
          window.print();
          // Close the iframe after printing
          setTimeout(() => {
            if (window.parent) {
              window.parent.postMessage('print-complete', '*');
            }
          }, 1000);
        }, 500);
      } else {
        // We're in a regular window, use the existing print function
        setTimeout(() => window.print(), 500);
      }
    }
  } catch (_) { }
});
