🏥 Multi-Specialty Clinic Management System
Overview

The Multi-Specialty Clinic Management System is a desktop-based application designed to manage essential clinic operations. It helps organize appointments, patient records, and medical documentation while supporting workflows for a doctor or clinic staff.

The system stores comprehensive patient information, including personal details, vital measurements, and medical records such as diagnosis history.

Key Features

Appointment scheduling for multiple doctors

Patient records and diagnosis history management

Detailed patient profiles:

Height

Weight

BMI

Blood type

Printing of:

Prescriptions

Laboratory exam requests

Medical certificates

Centralized and organized clinic workflow management

System Preview
<p align="center"> <img src="screenshots/dashboard.png" width="45%" /> <img src="screenshots/patient-profile.png" width="45%" /> </p> <p align="center"> <img src="screenshots/appointment.png" width="45%" /> <img src="screenshots/prescription.png" width="45%" /> </p>
Tech Stack

Backend: Node.js, Express

Frontend: Bootstrap

Database: SQLite

Project Structure
server/   → Node.js backend and dependencies
dist/     → Compiled Windows executable (server.exe)

How to Build and Run
1️⃣ Navigate to the server directory
cd server

2️⃣ Install dependencies
npm install

⚠️ If you encounter errors, ensure that sqlite3 is installed on your system.
This application relies on the local environment and is not built using a virtual environment.

3️⃣ Build the application for Windows
npm run build:win

4️⃣ Run the application
dist/server.exe


The system is now ready to use.

Notes

Designed as a desktop clinic management solution

Uses SQLite for lightweight local data storage

Suitable for small to medium-sized clinics
