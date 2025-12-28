# Multi-Specialty Clinic Management System

## Thumbnail / Demo
A visual overview of the system:

![Clinic System Thumbnail 1](https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/608428742_846778574807550_4880212780781955053_n.png)
![Clinic System Thumbnail 2](https://example.com/image2.png)
![Clinic System Thumbnail 3](https://example.com/image3.png)
![Clinic System Thumbnail 4](https://example.com/image4.png)


---

## Overview
The **Multi-Specialty Clinic Management System** fully digitizes an exclusive clinic workflow. It manages appointments, patient records, and printing of prescriptions, laboratory exams, and certificates. The system streamlines operations for multiple doctors and clinic staff.

**Key Features:**
- Appointment scheduling for multiple doctors  
- Patient records and history management  
- Printing of prescriptions, laboratory exams, and certificates  
- Complete digitization of clinic workflows  

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

bash
Copy code
npm install
⚠️ If you encounter errors, make sure sqlite3 is installed on your PC. This system relies on your environment since it is not created using a virtual environment.

Build the system for Windows:

bash
Copy code
npm run build:win
Open the compiled executable:

bash
Copy code
dist/server.exe
The system is ready to use.
