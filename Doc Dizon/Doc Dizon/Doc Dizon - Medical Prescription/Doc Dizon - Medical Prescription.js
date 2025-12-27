const input = document.getElementById("age");

input.addEventListener("input", function () {
  if (this.value.length > 3) {
    this.value = this.value.slice(0, 3); // keep only first 3 digits
  }
});

function clearBtn() {
  // Clear all text and date inputs
  document
    .querySelectorAll(
      'input[type="text"], input[type="date"], input[type="number"], input[type="email"]'
    )
    .forEach((input) => {
      input.value = "";
    });

  // Reset all selects
  document.querySelectorAll("select").forEach((select) => {
    select.selectedIndex = 0; // back to "Type" or "Sex"
  });

  // Uncheck all checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Clear editable spans (doctor info)
  document.querySelectorAll(".editable-line").forEach((span) => {
    span.textContent = "";
  });
}

function printPrescription() {
  // Check if follow-up date has a value
  const followupInput = document.getElementById("follow-up");
  const followupSection = document.querySelector(".follow-up");

  if (followupInput && followupSection) {
    if (!followupInput.value || followupInput.value.trim() === '') {
      // Hide follow-up section if no date is selected
      followupSection.style.display = 'none';
    } else {
      // Show follow-up section if date is selected
      followupSection.style.display = 'flex';
    }
  }

  window.print();

  // Restore follow-up section visibility after printing
  if (followupSection) {
    followupSection.style.display = 'flex';
  }
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

    // Update the doctor name and license in both footers
    const doctorNameEls = [
      document.getElementById('doctor-name'),
      document.getElementById('doctor-name-2')
    ];
    const licenseEls = [
      document.getElementById('doctor-license'),
      document.getElementById('doctor-license-2')
    ];

    if (doctorProfile.fullName) {
      let displayName = doctorProfile.fullName;
      if (doctorProfile.abbreviations) {
        displayName += ` ${doctorProfile.abbreviations}`;
      }

      doctorNameEls.forEach(el => {
        if (el) el.textContent = displayName;
      });
    }

    if (doctorProfile.licenseNumber) {
      const licenseText = `License No. ${doctorProfile.licenseNumber}`;
      licenseEls.forEach(el => {
        if (el) el.textContent = licenseText;
      });
    }

  } catch (error) {
    console.warn('Error loading doctor info:', error);
    // Keep default doctor info if there's an error
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.value = today;
  }

  // Load doctor information
  loadDoctorInfo();

  // Handle URL parameters for prefilling data
  const urlParams = new URLSearchParams(window.location.search);

  // Debug: Log URL parameters
  console.log('URL parameters:', Object.fromEntries(urlParams.entries()));

  // Fill patient information
  const nameInput = document.getElementById("name");
  const sexSelect = document.getElementById("sex");
  const addressInput = document.getElementById("address");
  const ageInput = document.getElementById("age");

  // Debug: Log found elements
  console.log('Found elements:', {
    nameInput: !!nameInput,
    sexSelect: !!sexSelect,
    addressInput: !!addressInput,
    ageInput: !!ageInput
  });

  if (nameInput && urlParams.get("name")) {
    const nameValue = urlParams.get("name");
    nameInput.value = nameValue;
    console.log('Set name to:', nameValue);
  }

  if (sexSelect && urlParams.get("sex")) {
    const rawSex = String(urlParams.get("sex") || "");
    const s = rawSex.trim().toLowerCase();
    let normalized = "";
    if (s.startsWith("m")) normalized = "Male";
    else if (s.startsWith("f")) normalized = "Female";
    else if (s) normalized = "Other";
    if (normalized) {
      sexSelect.value = normalized;
      console.log('Set sex to:', normalized, 'from raw:', rawSex);
    }
  }

  if (addressInput && urlParams.get("address")) {
    const addressValue = urlParams.get("address");
    addressInput.value = addressValue;
    console.log('Set address to:', addressValue);
  }

  if (dateInput && urlParams.get("date")) {
    dateInput.value = urlParams.get("date");
  }

  // Compute age from dob if provided
  const dobParam = urlParams.get("dob");
  console.log('DOB parameter:', dobParam);
  if (ageInput && dobParam) {
    const d = new Date(dobParam);
    console.log('Parsed DOB date:', d);
    if (!isNaN(d.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      console.log('Calculated age:', age);
      if (age >= 0 && age <= 150) {
        ageInput.value = String(age);
        console.log('Set age to:', age);
      }
    }
  }

  // Fill follow-up date
  const followupInput = document.getElementById("follow-up");
  console.log('Follow-up input found:', !!followupInput);
  if (followupInput && urlParams.get("followup")) {
    const followupValue = urlParams.get("followup");
    followupInput.value = followupValue;
    console.log('Set follow-up to:', followupValue);
  }

  // Handle prescription data
  const prescriptionParam = urlParams.get("prescription");
  if (prescriptionParam) {
    try {
      console.log('Prescription parameter received:', prescriptionParam);
      const prescriptionData = JSON.parse(prescriptionParam);
      console.log('Parsed prescription data:', prescriptionData);
      if (prescriptionData.medicines && Array.isArray(prescriptionData.medicines)) {
        prescriptionData.medicines.forEach((med, index) => {
          // Find the corresponding row in the table (1-based indexing)
          const rowIndex = index + 1;
          if (rowIndex <= 5) { // Max 5 rows
            // Fill medicine name - use table row structure to find the right inputs
            const table = document.querySelector('table');
            if (table) {
              const rows = table.querySelectorAll('tr.row');
              const medicineRowIndex = index * 2; // Each medicine has 2 rows
              console.log(`Processing medicine ${index + 1}:`, med);
              console.log(`Found ${rows.length} rows, using index ${medicineRowIndex}`);

              if (rows[medicineRowIndex]) {
                // First medicine input in the main row
                const firstMedInput = rows[medicineRowIndex].querySelector('input[type="text"]');
                if (firstMedInput) {
                  firstMedInput.value = med.medicine || '';
                }

                // Quantity input in the same row
                const qtyInput = rows[medicineRowIndex].querySelector('input[type="number"]');
                if (qtyInput) {
                  qtyInput.value = med.quantity || '';
                }

                // Fill checkboxes for breakfast, lunch, dinner
                const checkboxes = rows[medicineRowIndex].querySelectorAll('input[type="checkbox"]');

                if (checkboxes[0] && med.breakfast) {
                  checkboxes[0].checked = med.breakfast.before || false; // Breakfast before
                  checkboxes[1].checked = med.breakfast.after || false; // Breakfast after
                }
                if (checkboxes[2] && med.lunch) {
                  checkboxes[2].checked = med.lunch.before || false; // Lunch before
                  checkboxes[3].checked = med.lunch.after || false; // Lunch after
                }
                if (checkboxes[4] && med.dinner) {
                  checkboxes[4].checked = med.dinner.before || false; // Dinner before
                  checkboxes[5].checked = med.dinner.after || false; // Dinner after
                }
                if (checkboxes[6] && med.bedtime) {
                  checkboxes[6].checked = med.bedtime.before || false; // Bedtime before
                }
              }

              // Second row holds additional text fields; set the FIRST field (under Medicine) as the note
              if (rows[medicineRowIndex + 1]) {
                const secondRowTextInputs = rows[medicineRowIndex + 1].querySelectorAll('input[type="text"]');
                if (secondRowTextInputs && secondRowTextInputs.length > 0) {
                  // Put note under Medicine column
                  secondRowTextInputs[0].value = med.note || '';
                  // Put meal note under the wide field spanning meal columns (if present)
                  if (secondRowTextInputs.length > 1) {
                    secondRowTextInputs[1].value = med.mealNote || '';
                  }
                }
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Error parsing prescription data:', e);
    }
  }

  // Auto-print if requested
  if (urlParams.get("autoprint") === "1") {
    // Check if we're in an iframe (for direct printing without new tab)
    if (window.self !== window.top) {
      // We're in an iframe, print directly
      setTimeout(() => {
        // Handle follow-up section visibility before printing
        const followupInput = document.getElementById("follow-up");
        const followupSection = document.querySelector(".follow-up");

        if (followupInput && followupSection) {
          if (!followupInput.value || followupInput.value.trim() === '') {
            followupSection.style.display = 'none';
          } else {
            followupSection.style.display = 'flex';
          }
        }

        window.print();

        // Restore follow-up section visibility after printing
        if (followupSection) {
          followupSection.style.display = 'flex';
        }

        // Close the iframe after printing
        setTimeout(() => {
          if (window.parent) {
            window.parent.postMessage('print-complete', '*');
          }
        }, 1000);
      }, 1000);
    } else {
      // We're in a regular window, use the existing print function
      setTimeout(() => {
        // Handle follow-up section visibility before printing
        const followupInput = document.getElementById("follow-up");
        const followupSection = document.querySelector(".follow-up");

        if (followupInput && followupSection) {
          if (!followupInput.value || followupInput.value.trim() === '') {
            followupSection.style.display = 'none';
          } else {
            followupSection.style.display = 'flex';
          }
        }

        window.print();

        // Restore follow-up section visibility after printing
        if (followupSection) {
          followupSection.style.display = 'flex';
        }
      }, 1000);
    }
  }
});
