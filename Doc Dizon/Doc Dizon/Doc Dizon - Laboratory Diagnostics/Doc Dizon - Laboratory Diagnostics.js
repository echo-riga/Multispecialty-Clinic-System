const input = document.getElementById("age");

input.addEventListener("input", function () {
  if (this.value.length > 3) {
    this.value = this.value.slice(0, 3); // keep only first 3 digits
  }
});

// Clear all entered information
function clearBtn() {
  // Clear text and date inputs
  document.getElementById("name").value = "";
  document.getElementById("age").value = "";
  document.getElementById("sex").value = "";
  document.getElementById("address").value = "";
  document.getElementById("date").value = "";
  document.getElementById("follow-up").value = ""; // Fixed: changed from "follow-up-footer" to "follow-up"
  document.getElementById("other-tests").value = "";

  // Clear all multi-selects
  const multiSelects = document.querySelectorAll(".multi-select");
  multiSelects.forEach((select) => {
    Array.from(select.options).forEach((option) => {
      option.selected = false;
      option.style.backgroundColor = "";
      option.style.color = "";
    });
  });

  // Clear selected tests display
  const selectedTests = document.querySelectorAll(".selected-tests");
  selectedTests.forEach((div) => (div.innerHTML = ""));

  // Remove has-selected class from all categories
  const categories = document.querySelectorAll(".category");
  categories.forEach((cat) => cat.classList.remove("has-selected"));
}

// Function to create a new page header (clinic-header + form-section) using current user info
function createPageHeader(pageNum) {
  // Get current user info
  const name = document.getElementById("name")?.value || "";
  const age = document.getElementById("age")?.value || "";
  const sex = document.getElementById("sex")?.value || "";
  const address = document.getElementById("address")?.value || "";
  const date = document.getElementById("date")?.value || "";

  // Build header HTML (NO section title here)
  const pageHeader = document.createElement("div");
  pageHeader.className = "page-header";
  pageHeader.innerHTML = `
    <img src=".\\Preclaro-Dizon-Logo.png" alt="CLINIC-LOGO">
    <div class="form-section">
      <div class="patient-info">
        <input type="text" id="name-${pageNum}" placeholder="Name" value="${name}" readonly>
        <input type="text" id="age-${pageNum}" placeholder="Age" value="${age}" readonly>
        <select id="sex-${pageNum}" disabled>
          <option value="" ${sex === "" ? "selected" : ""}>Sex</option>
          <option value="Male" ${sex === "Male" ? "selected" : ""}>Male</option>
          <option value="Female" ${
            sex === "Female" ? "selected" : ""
          }>Female</option>
          <option value="Other" ${
            sex === "Other" ? "selected" : ""
          }>Other</option>
        </select>
      </div>
      <div class="patient-info">
        <input type="text" id="address-${pageNum}" placeholder="Address" style="flex: 2;" value="${address}" readonly>
        <input type="date" id="date-${pageNum}" placeholder="Date" value="${date}" readonly>
      </div>
    </div>
  `;
  return pageHeader;
}

// Example usage: add header to a new page
function addNewPageWithHeader() {
  const pagesContainer = document.getElementById("pages-container");
  if (!pagesContainer) return;
  const pageNum = document.querySelectorAll(".page-header").length + 1;
  const header = createPageHeader(pageNum);
  const newPage = document.createElement("div");
  newPage.className = "page";
  newPage.appendChild(header);
  pagesContainer.appendChild(newPage);
}

let medicationCount = 1;
let medicationPerPage = 3;
let currentPageMedications = 1;

// Store references to all select elements
const selectElements = {
  hematology: document.getElementById("hematology-select"),
  microscopy: document.getElementById("microscopy-select"),
  serology: document.getElementById("serology-select"),
  bacteriology: document.getElementById("bacteriology-select"),
  chemistry: document.getElementById("chemistry-select"),
  enzymes: document.getElementById("enzymes-select"),
  hepatitis: document.getElementById("hepatitis-select"),
  thyroid: document.getElementById("thyroid-select"),
  tumour: document.getElementById("tumour-select"),
  histopathology: document.getElementById("histopathology-select"),
  xray: document.getElementById("xray-select"),
  ultrasound: document.getElementById("ultrasound-select"),
  cardiology: document.getElementById("cardiology-select"),
  vascular: document.getElementById("vascular-select"),
};

// Store references to all selected tests containers
const selectedContainers = {
  hematology: document.getElementById("hematology-selected"),
  microscopy: document.getElementById("microscopy-selected"),
  serology: document.getElementById("serology-selected"),
  bacteriology: document.getElementById("bacteriology-selected"),
  chemistry: document.getElementById("chemistry-selected"),
  enzymes: document.getElementById("enzymes-selected"),
  hepatitis: document.getElementById("hepatitis-selected"),
  thyroid: document.getElementById("thyroid-selected"),
  tumour: document.getElementById("tumour-selected"),
  histopathology: document.getElementById("histopathology-selected"),
  xray: document.getElementById("xray-selected"),
  ultrasound: document.getElementById("ultrasound-selected"),
  cardiology: document.getElementById("cardiology-selected"),
  vascular: document.getElementById("vascular-selected"),
  others: document.getElementById("others-selected"),
};

// Store references to category elements
const categoryElements = {
  hematology: document.getElementById("hematology-category"),
  microscopy: document.getElementById("microscopy-category"),
  serology: document.getElementById("serology-category"),
  bacteriology: document.getElementById("bacteriology-category"),
  chemistry: document.getElementById("chemistry-category"),
  enzymes: document.getElementById("enzymes-category"),
  hepatitis: document.getElementById("hepatitis-category"),
  thyroid: document.getElementById("thyroid-category"),
  tumour: document.getElementById("tumour-category"),
  histopathology: document.getElementById("histopathology-category"),
  xray: document.getElementById("xray-category"),
  ultrasound: document.getElementById("ultrasound-category"),
  cardiology: document.getElementById("cardiology-category"),
  vascular: document.getElementById("vascular-category"),
  others: document.getElementById("others-category"),
};

// Function to load doctor information from the API
async function loadDoctorInfo() {
  try {
    // Get auth headers from localStorage
    const raw = localStorage.getItem("authUser");
    if (!raw) {
      console.warn("No auth user found, using default doctor info");
      return;
    }

    const { username, role } = JSON.parse(raw);
    if (role !== "doctor") {
      console.warn("User is not a doctor, using default doctor info");
      return;
    }

    // Fetch doctor profile
    const response = await fetch("/api/doctors/me", {
      headers: {
        "X-User": username,
        "X-Role": role,
      },
    });

    if (!response.ok) {
      console.warn("Failed to fetch doctor profile, using default doctor info");
      return;
    }

    const doctorProfile = await response.json();

    // Update the doctor name and license in both footers
    const doctorNameEls = [
      document.getElementById("doctor-name"),
      document.getElementById("doctor-name-2"),
    ];
    const licenseEls = [
      document.getElementById("doctor-license"),
      document.getElementById("doctor-license-2"),
    ];

    if (doctorProfile.fullName) {
      let displayName = doctorProfile.fullName;
      if (doctorProfile.abbreviations) {
        displayName += ` ${doctorProfile.abbreviations}`;
      }

      doctorNameEls.forEach((el) => {
        if (el) el.textContent = displayName;
      });
    }

    if (doctorProfile.licenseNumber) {
      const licenseText = `License No. ${doctorProfile.licenseNumber}`;
      licenseEls.forEach((el) => {
        if (el) el.textContent = licenseText;
      });
    }
  } catch (error) {
    console.warn("Error loading doctor info:", error);
    // Keep default doctor info if there's an error
  }
}

// Enhance multi-select functionality
document.addEventListener("DOMContentLoaded", function () {
  // Set current date automatically
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.value = today;

  // Load doctor information
  loadDoctorInfo();

  // Prefill from URL query parameters if provided
  try {
    const params = new URLSearchParams(window.location.search);
    const byName = (id) => document.getElementById(id);
    const setIf = (el, val) => {
      if (el && val !== null && val !== undefined && String(val).length)
        el.value = val;
    };
    const name = params.get("name");
    const age = params.get("age");
    const sex = params.get("sex");
    const address = params.get("address");
    const date = params.get("date");
    const dob = params.get("dob");
    // Compute age from dob if age not provided
    let computedAge = "";
    if ((!age || age === "") && dob) {
      const d = new Date(dob);
      if (!Number.isNaN(d.getTime())) {
        const now = new Date();
        let a = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
        if (a >= 0) computedAge = String(a);
      }
    }
    setIf(byName("name"), name);
    setIf(byName("age"), age || computedAge);
    if (sex && byName("sex")) {
      const sel = byName("sex");
      const v = String(sex).toLowerCase();
      sel.value =
        v === "male"
          ? "Male"
          : v === "female"
          ? "Female"
          : v === "other"
          ? "Other"
          : "";
    }
    setIf(byName("address"), address);
    setIf(byName("date"), date);

    // Fill follow-up date
    const followup = params.get("followup");
    console.log("Follow-up date parameter:", followup);

    // Set follow-up date to input
    const followupInput = byName("follow-up");

    if (followupInput && followup) {
      followupInput.value = followup;
      console.log("Follow-up input value set to:", followupInput.value);
    }

    // Others/tests free text
    const others = params.get("others") || params.get("tests");

    // Pre-select tests from the others parameter
    if (others) {
      const testList = others
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (testList.length > 0) {
        // Map of test names to their select element IDs
        const testToSelectMap = {
          "CBC w/ Platelet Count": "hematology-select",
          "Prothrombin Time": "hematology-select",
          "Partial Thromboplastin Time (PTT)": "hematology-select",
          APTT: "hematology-select",
          "Clotting Time": "hematology-select",
          "Bleeding Time": "hematology-select",
          "Peripheral Blood Smear": "hematology-select",
          "Blood Typing (RH)": "hematology-select",
          Urinalysis: "microscopy-select",
          Fecalysis: "microscopy-select",
          "Occult blood": "microscopy-select",
          "Occult Blood": "microscopy-select",
          "Pregnancy Test (Serum)": "microscopy-select",
          "Pregnancy Test (Urine)": "microscopy-select",
          "Dengue NS1": "serology-select",
          "Dengue Duo IgG": "serology-select",
          "Dengue Duo IgM": "serology-select",
          "VDRL (RPR)": "serology-select",
          HBsAg: "serology-select",
          "Rubella IgM": "serology-select",
          "Rubella IgG": "serology-select",
          "HIV Screening": "serology-select",
          "CRP Qualitative": "serology-select",
          "CRP Quantitative": "serology-select",
          "ASO Screening": "serology-select",
          "ASO Titer": "serology-select",
          "Urine Culture & Sensitivity": "bacteriology-select",
          "Blood Culture & Sensitivity": "bacteriology-select",
          "Gram Staining": "bacteriology-select",
          "KOH Staining": "bacteriology-select",
          "AFB Staining": "bacteriology-select",
          "Fasting Blood Sugar (FBS)": "chemistry-select",
          "Random Blood Sugar (RBS)": "chemistry-select",
          HbA1c: "chemistry-select",
          "Blood Urea Nitrogen (BUN)": "chemistry-select",
          "Uric Acid": "chemistry-select",
          Creatinine: "chemistry-select",
          "Sodium (Na)": "chemistry-select",
          "Potassium (K)": "chemistry-select",
          "Chloride (Cl)": "chemistry-select",
          "Calcium (Ca)": "chemistry-select",
          "Ionized Calcium (iCa)": "chemistry-select",
          "Phosphorus (P)": "chemistry-select",
          "SGOT (AST)": "chemistry-select",
          "SGPT (ALT)": "chemistry-select",
          "Lipid Profile": "chemistry-select",
          "Total Cholesterol": "chemistry-select",
          Triglycerides: "chemistry-select",
          HDL: "chemistry-select",
          LDL: "chemistry-select",
          VLDL: "chemistry-select",
          "Prostate Specific Antigen (PSA)": "chemistry-select",
          PSA: "chemistry-select",
          "Alkaline Phosphatase": "enzymes-select",
          "CPK-MB": "enzymes-select",
          "CPK-MM": "enzymes-select",
          GGTP: "enzymes-select",
          "Serum LDH": "enzymes-select",
          "Total CPK": "enzymes-select",
          "Troponin I Qualitative": "enzymes-select",
          "Troponin I Quantitative": "enzymes-select",
          "Anti-HAV lgG": "hepatitis-select",
          "Anti-HAV lgM": "hepatitis-select",
          "Anti-HBclgG": "hepatitis-select",
          "Anti-HBclgM": "hepatitis-select",
          "Anti-HBe": "hepatitis-select",
          "Anti-HBs": "hepatitis-select",
          "Anti-HCV": "hepatitis-select",
          HBeAg: "hepatitis-select",
          "HBsAg (Confirmatory)": "hepatitis-select",
          "HBsAg (Screening)": "hepatitis-select",
          "Hepa A & B Profile (1-5 + 7)": "hepatitis-select",
          "Hepa A, B, C (1-5, +7, & 9)": "hepatitis-select",
          "Hepa A Profile (7-8)": "hepatitis-select",
          "Hepa B Full Profile (1-6)": "hepatitis-select",
          FT3: "thyroid-select",
          FT4: "thyroid-select",
          "FT3 RIA": "thyroid-select",
          "FT4 RIA": "thyroid-select",
          Thyroglobulin: "thyroid-select",
          TSH: "thyroid-select",
          "TSH (IRMA)": "thyroid-select",
          "CA 12-5 (Ovary)": "tumour-select",
          "CA 15-3 (Breast)": "tumour-select",
          "CA 19-9 (Pancreas)": "tumour-select",
          CEA: "tumour-select",
          "Serum B-HCG": "tumour-select",
          "Aspiration Biopsy": "histopathology-select",
          "Small/Medium/Large/Extra Large": "histopathology-select",
          "Chest PA, Lateral": "xray-select",
          "Chest PA-L": "xray-select",
          "Chest AP, Lateral": "xray-select",
          "Chest AP & Lateral": "xray-select",
          "Chest Apicolordotic View": "xray-select",
          "Ankle AP/Lateral etc.": "xray-select",
          "Ankle AP/Lateral": "xray-select",
          Breast: "ultrasound-select",
          Gallbladder: "ultrasound-select",
          HBT: "ultrasound-select",
          "Inguino-Scrotal": "ultrasound-select",
          Kidney: "ultrasound-select",
          KUB: "ultrasound-select",
          "KUB - P": "ultrasound-select",
          Liver: "ultrasound-select",
          "Lower Abdomen": "ultrasound-select",
          Pancreas: "ultrasound-select",
          Pelvic: "ultrasound-select",
          Prostate: "ultrasound-select",
          Spleen: "ultrasound-select",
          Transvaginal: "ultrasound-select",
          "Upper Abdomen": "ultrasound-select",
          "Whole Abdomen": "ultrasound-select",
          "2D Echo Plain": "cardiology-select",
          "2D Echo with Doppler": "cardiology-select",
          "ECG (Electrocardiogram)": "cardiology-select",
          "Ankle Brachial Index (ABI)": "vascular-select",
          "Arterial Duplex Scan - Lower (Bilateral/Unilateral)":
            "vascular-select",
          "Arterial Duplex Scan - Upper": "vascular-select",
          "AV Mapping": "vascular-select",
          "Carotid Duplex Scan": "vascular-select",
          "Venous Duplex Scan - Lower (Bilateral/Unilateral)":
            "vascular-select",
          "Venous Duplex Scan - Upper": "vascular-select",
        };

        // Separate tests that belong to specific categories from those that should go in "others"
        const categorizedTests = [];
        const otherTests = [];

        testList.forEach((testName) => {
          const selectId = testToSelectMap[testName];
          if (selectId) {
            categorizedTests.push(testName);
          } else {
            otherTests.push(testName);
          }
        });

        // Pre-select the categorized tests
        categorizedTests.forEach((testName) => {
          const selectId = testToSelectMap[testName];
          const select = byName(selectId);
          if (select) {
            const option = Array.from(select.options).find(
              (opt) => opt.value === testName
            );
            if (option) {
              option.selected = true;
              option.style.backgroundColor = "#4CAF50";
              option.style.color = "white";
            }
          }
        });

        // Set the remaining tests in the "others" field
        if (otherTests.length > 0) {
          setIf(byName("other-tests"), otherTests.join(", "));
        }

        // Update the selected tests display
        Object.keys(selectElements).forEach((key) => {
          const select = selectElements[key];
          const container = selectedContainers[key];
          const category = categoryElements[key];
          if (!select || !container || !category) return;
          container.innerHTML = "";
          const selectedOptions = Array.from(select.selectedOptions).map(
            (opt) => opt.value
          );
          selectedOptions.forEach((test) => {
            const div = document.createElement("div");
            div.className = "selected-test";
            div.textContent = test;
            container.appendChild(div);
          });
          if (selectedOptions.length > 0) {
            category.classList.add("has-selected");
          } else {
            category.classList.remove("has-selected");
          }
        });
      }
    }

    // Auto-print if requested
    const autoprint = params.get("autoprint");
    if (autoprint === "1") {
      // Check if we're in an iframe (for direct printing without new tab)
      if (window.self !== window.top) {
        // We're in an iframe, print directly
        setTimeout(() => {
          try {
            // Handle follow-up section visibility before printing - FIXED
            const followupInput = document.getElementById("follow-up"); // Fixed: changed from "follow-up-footer"
            const followupSection = document.querySelector(".follow-up");

            if (followupInput) {
              if (!followupInput.value || followupInput.value.trim() === "") {
                if (followupSection) {
                  followupSection.style.setProperty(
                    "display",
                    "none",
                    "important"
                  );
                  followupSection.style.setProperty(
                    "visibility",
                    "hidden",
                    "important"
                  );
                }
              } else {
                if (followupSection) {
                  followupSection.style.setProperty(
                    "display",
                    "block",
                    "important"
                  );
                  followupSection.style.setProperty(
                    "visibility",
                    "visible",
                    "important"
                  );
                }
              }
            }

            printPrescription();

            // Restore follow-up section visibility after printing
            if (followupSection) {
              followupSection.style.setProperty(
                "display",
                "block",
                "important"
              );
              followupSection.style.setProperty(
                "visibility",
                "visible",
                "important"
              );
            }

            // Close the iframe after printing
            setTimeout(() => {
              if (window.parent) {
                window.parent.postMessage("print-complete", "*");
              }
            }, 1000);
          } catch (_) {}
        }, 300);
      } else {
        // We're in a regular window, use the existing print function
        setTimeout(() => {
          try {
            // Handle follow-up section visibility before printing - FIXED
            const followupInput = document.getElementById("follow-up"); // Fixed: changed from "followupFooter"
            const followupSection = document.querySelector(".follow-up");

            if (followupInput) {
              if (!followupInput.value || followupInput.value.trim() === "") {
                if (followupSection) {
                  followupSection.style.setProperty(
                    "display",
                    "none",
                    "important"
                  );
                  followupSection.style.setProperty(
                    "visibility",
                    "hidden",
                    "important"
                  );
                }
              } else {
                if (followupSection) {
                  followupSection.style.setProperty(
                    "display",
                    "block",
                    "important"
                  );
                  followupSection.style.setProperty(
                    "visibility",
                    "visible",
                    "important"
                  );
                }
              }
            }

            printPrescription();

            // Restore follow-up section visibility after printing
            if (followupSection) {
              followupSection.style.setProperty(
                "display",
                "block",
                "important"
              );
              followupSection.style.setProperty(
                "visibility",
                "visible",
                "important"
              );
            }
          } catch (_) {}
        }, 300);
      }
    }
  } catch (_) {}

  // Make it easier to select multiple options
  Object.values(selectElements).forEach((select) => {
    if (!select) return;
    select.addEventListener("mousedown", function (e) {
      e.preventDefault();

      const option = e.target;
      if (option.tagName === "OPTION") {
        option.selected = !option.selected;

        // Highlight the selected options
        if (option.selected) {
          option.style.backgroundColor = "#4CAF50";
          option.style.color = "white";
        } else {
          option.style.backgroundColor = "";
          option.style.color = "";
        }
      }
    });

    // Prevent the dropdown from closing when clicking
    select.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  });

  // Auto-focus the first field for better UX
  document.getElementById("name").focus();
});

function cloneHeaderAndForm() {
  const clinicHeader = document.querySelector(".clinic-header");
  const formSection = document.querySelector(".form-section");
  const headerClone = clinicHeader ? clinicHeader.cloneNode(true) : null;
  const formClone = formSection ? formSection.cloneNode(true) : null;
  if (formClone) {
    formClone.querySelector("#name").value =
      document.getElementById("name").value;
    formClone.querySelector("#age").value =
      document.getElementById("age").value;
    formClone.querySelector("#sex").value =
      document.getElementById("sex").value;
    formClone.querySelector("#address").value =
      document.getElementById("address").value;
    formClone.querySelector("#date").value =
      document.getElementById("date").value;
  }
  return { headerClone, formClone };
}

function paginateChecklist() {
  const checklist = document.getElementById("main-checklist");
  const categories = Array.from(checklist.children).filter(
    (el) => el.classList && el.classList.contains("category")
  );
  const maxPerPage = 6;
  document.querySelectorAll(".dynamic-page").forEach((el) => el.remove());
  let pageNum = 1;
  let selectedCategories = categories.filter((cat) =>
    cat.classList.contains("has-selected")
  );
  // If no categories are selected, only show the first 6 (or less) on one page
  if (selectedCategories.length === 0) {
    selectedCategories = categories.slice(0, maxPerPage);
  }
  const totalPages = Math.ceil(selectedCategories.length / maxPerPage);
  let createdPages = 0;
  let lastPage = null;
  for (let i = 0; i < selectedCategories.length; i += maxPerPage) {
    const pageCategories = selectedCategories.slice(i, i + maxPerPage);
    if (pageCategories.length === 0) continue;
    const page = document.createElement("div");
    page.className = "dynamic-page";
    page.style.pageBreakAfter = "always";

    // Duplicate the actual header and form-section markup for each page
    const clinicHeader = document.querySelector(".clinic-header");
    const formSection = document.querySelector(".form-section");
    if (clinicHeader) {
      const headerClone = clinicHeader.cloneNode(true);
      page.appendChild(headerClone);
    }
    if (formSection) {
      const formClone = formSection.cloneNode(true);
      formClone.querySelector("#name").value =
        document.getElementById("name").value;
      formClone.querySelector("#age").value =
        document.getElementById("age").value;
      formClone.querySelector("#sex").value =
        document.getElementById("sex").value;
      formClone.querySelector("#address").value =
        document.getElementById("address").value;
      formClone.querySelector("#date").value =
        document.getElementById("date").value;
      page.appendChild(formClone);
    }

    const sectionTitle = document.createElement("div");
    sectionTitle.className = "section-title";
    sectionTitle.textContent = "Laboratory Checklist";
    page.appendChild(sectionTitle);

    const pageChecklist = document.createElement("div");
    pageChecklist.className = "checklist";
    pageCategories.forEach((cat) => {
      pageChecklist.appendChild(cat.cloneNode(true));
    });
    page.appendChild(pageChecklist);

    createdPages++;
    lastPage = page;
    checklist.parentNode.insertBefore(page, checklist);
    pageNum++;
  }
  // Add footer only to the last actual page
  if (lastPage) {
    const footer = document.getElementById("main-footer");
    if (footer) {
      const footerClone = footer.cloneNode(true);

      // Check follow-up date in the cloned footer
      const followupInputClone = footerClone.querySelector("#follow-up");
      const followupSectionClone = footerClone.querySelector(".follow-up");

      if (followupInputClone && followupSectionClone) {
        if (
          !followupInputClone.value ||
          followupInputClone.value.trim() === ""
        ) {
          followupSectionClone.style.setProperty(
            "display",
            "none",
            "important"
          );
          followupSectionClone.style.setProperty(
            "visibility",
            "hidden",
            "important"
          );
        } else {
          followupSectionClone.style.setProperty(
            "display",
            "block",
            "important"
          );
          followupSectionClone.style.setProperty(
            "visibility",
            "visible",
            "important"
          );
        }
      }

      lastPage.appendChild(footerClone);
    }
    lastPage.style.pageBreakAfter = "auto"; // Remove page break from last page
  }
  document.querySelector(".clinic-header").style.display = "none";
  document.querySelector(".form-section").style.display = "none";
  checklist.style.display = "none";
  document.getElementById("main-footer").style.display = "none";

  // CSS fix: Remove forced page break if only one page
  const dynamicPages = document.querySelectorAll(".dynamic-page");
  if (dynamicPages.length === 1) {
    dynamicPages[0].style.pageBreakAfter = "auto";
  }
}

function restoreOriginal() {
  document.querySelectorAll(".dynamic-page").forEach((el) => el.remove());
  document.querySelector(".clinic-header").style.display = "";
  document.querySelector(".form-section").style.display = "";
  document.getElementById("main-checklist").style.display = "";
  document.getElementById("main-footer").style.display = "";
}

function printPrescription() {
  // Check if follow-up date has a value - FIXED ID
  const followupInput = document.getElementById("follow-up");
  const followupSection = document.querySelector(".follow-up");

  if (followupInput) {
    if (!followupInput.value || followupInput.value.trim() === "") {
      // Hide follow-up section if no date is selected
      if (followupSection) {
        followupSection.style.setProperty("display", "none", "important");
        followupSection.style.setProperty("visibility", "hidden", "important");
      }
    } else {
      // Show follow-up section if date is selected
      if (followupSection) {
        followupSection.style.setProperty("display", "block", "important");
        followupSection.style.setProperty("visibility", "visible", "important");
      }
    }
  }

  // Update selected tests for each category before paginating
  Object.keys(selectElements).forEach((key) => {
    const select = selectElements[key];
    const container = selectedContainers[key];
    const category = categoryElements[key];
    if (!select || !container || !category) return;
    container.innerHTML = "";
    const selectedOptions = Array.from(select.selectedOptions).map(
      (opt) => opt.value
    );
    selectedOptions.forEach((test) => {
      const div = document.createElement("div");
      div.className = "selected-test";
      div.textContent = test;
      container.appendChild(div);
    });
    if (selectedOptions.length > 0) {
      category.classList.add("has-selected");
    } else {
      category.classList.remove("has-selected");
    }
  });

  // Handle "Others" field
  const otherTestsInput = document.getElementById("other-tests");
  const othersContainer = document.getElementById("others-selected");
  if (othersContainer) othersContainer.innerHTML = "";
  if (otherTestsInput && otherTestsInput.value) {
    const div = document.createElement("div");
    div.className = "selected-test";
    div.textContent = otherTestsInput.value;
    othersContainer.appendChild(div);
    categoryElements.others.classList.add("has-selected");
  } else {
    categoryElements.others.classList.remove("has-selected");
  }

  // Now paginate
  paginateChecklist();
  window.print();

  // Restore follow-up section visibility after printing
  if (followupSection) {
    followupSection.style.setProperty("display", "block", "important");
    followupSection.style.setProperty("visibility", "visible", "important");
  }

  restoreOriginal();
}
