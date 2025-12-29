🏥 Multi-Specialty Clinic Management System

A desktop-based clinic management system for handling appointments, patient records, and medical documentation. Built to organize daily clinical workflows for multiple doctors and clinic staff.

📌 Overview

The Multi-Specialty Clinic Management System manages core clinic operations such as appointment scheduling, patient information tracking, and medical document printing. It maintains detailed patient profiles, including vital measurements and diagnosis history, to support accurate and organized clinical records.

✨ Key Features
🗓️ Appointment Management

Schedule and manage appointments for multiple doctors

Organized daily and historical appointment records

👤 Patient Management

Centralized patient records

Diagnosis history tracking

Vital and medical details:

Height

Weight

BMI

Blood type

🧾 Medical Documents

Print-ready formats for:

Prescriptions

Laboratory exam requests

Medical certificates

⚙️ Workflow Management

Centralized clinic data handling

Reduced manual record-keeping

Structured and searchable records

🖼️ System Preview
<p align="center"> <img src="screenshots/dashboard.png" width="45%" alt="Dashboard" /> <img src="screenshots/patient-profile.png" width="45%" alt="Patient Profile" /> </p> <p align="center"> <img src="screenshots/appointment.png" width="45%" alt="Appointments" /> <img src="screenshots/prescription.png" width="45%" alt="Prescription Printing" /> </p>
🧰 Tech Stack
Layer	Technology
Backend	Node.js, Express
Frontend	Bootstrap
Database	SQLite
Platform	Windows Desktop
📁 Project Structure
├── server/        # Node.js backend and dependencies
├── dist/          # Compiled Windows executable (server.exe)
└── screenshots/   # Application screenshots for README

🚀 Getting Started
1️⃣ Navigate to the server directory
cd server

2️⃣ Install dependencies
npm install


⚠️ Important
Ensure sqlite3 is installed on your system.
This project relies on the local environment and is not packaged using a virtual environment.

3️⃣ Build for Windows
npm run build:win

4️⃣ Run the application
dist/server.exe


✔ The system is now ready to use.

📝 Notes

Designed as a desktop clinic management solution

Uses SQLite for lightweight local storage

Suitable for small to medium-scale clinics

Focuses on functionality and workflow organization
