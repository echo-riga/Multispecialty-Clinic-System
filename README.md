# Multi-Specialty Clinic Management System

![Clinic System Thumbnail](thumbnail.png)

## Overview
The **Multi-Specialty Clinic Management System** is a proprietary software solution created for a specific client. It is intended for healthcare use by doctors and clinic staff. The system streamlines patient workflows, digitizes records, and provides secure management of appointments, medical history, and patient details.  

**Key Features:**
- Appointment scheduling for multiple doctors  
- Patient records and history management  
- Printing of prescriptions, laboratory exams, and certificates  
- Exclusive workflow automation for healthcare professionals  
- Designed for clinic-specific workflows and customization  

---

## Tech Stack
- **Backend:** Node.js, Express  
- **Frontend:** Bootstrap  
- **Database:** SQLite  

---

## Project Structure

- `server/` → Contains the Node.js backend and all dependencies  
- `dist/` → Contains the compiled Windows executable (`server.exe`)  

---

## How to Build and Run

1. Navigate to the server directory:
```bash
cd server
Install dependencies:

npm install
⚠️ If you encounter errors, make sure sqlite3 is installed on your PC. This system relies on your environment since it is not created using a virtual environment.

Build the system for Windows:


npm run build:win
Open the compiled executable:


dist/server.exe
The system is ready to use.
