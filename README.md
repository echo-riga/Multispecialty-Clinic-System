🏥 Multi-Specialty Clinic Management System
📌 Overview

The Multi-Specialty Clinic Management System is a desktop-based application designed to manage essential clinic operations efficiently.
It supports appointment scheduling, patient record management, and medical document printing for multiple doctors and clinic staff.

The system maintains detailed patient profiles, including vital measurements and diagnosis history, ensuring organized, accurate, and accessible medical records.

✨ Key Features

📅 Appointment scheduling for multiple doctors

👤 Patient record management with diagnosis history

📊 Detailed patient information tracking

Height

Weight

BMI

Blood type

🖨️ Medical document printing

Prescriptions

Laboratory exam requests

Medical certificates

🏢 Centralized clinic workflow management

🖼️ Screenshots
<p align="center"> <img src="screenshots/dashboard.png" width="48%" /> <img src="screenshots/patient-profile.png" width="48%" /> </p> <p align="center"> <img src="screenshots/appointment.png" width="48%" /> <img src="screenshots/prescription.png" width="48%" /> </p>
🛠️ Tech Stack
Layer	Technology
Backend	Node.js, Express
Frontend	Bootstrap
Database	SQLite
Platform	Windows (Desktop)
📁 Project Structure
server/         Node.js backend and dependencies
dist/           Compiled Windows executable (server.exe)
screenshots/    Application screenshots

🚀 Build & Run
1️⃣ Install Dependencies
cd server
npm install


Note: Ensure sqlite3 is installed on your system.
This project runs on the local environment and does not use a virtual environment.

2️⃣ Build for Windows
npm run build:win

3️⃣ Run the Application
dist/server.exe

📝 Notes

Designed for desktop clinic management

Uses SQLite for lightweight local data storage

Suitable for small to medium-sized clinics
