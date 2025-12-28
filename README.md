# Multi-Specialty Clinic Management System


<p float="left">
  <a href="https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/608428742_846778574807550_4880212780781955053_n.png" target="_blank">
    <img src="https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/608428742_846428742807550_4880212780781955053_n.png" width="200" />
  </a>
  <a href="https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/605831623_1425401779191702_5554333328950806019_n.png" target="_blank">
    <img src="https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/605831623_1425401779191702_5554333328950806019_n.png" width="200" />
  </a>
  <a href="https://scontent.fmnl4-7.fna.fbcdn.net/v/t1.15752-9/605135623_1889208815322055_3091992793292127559_n.png" target="_blank">
    <img src="https://scontent.fmnl4-7.fna.fbcdn.net/v/t1.15752-9/605135623_1889208815322055_3091992793292127559_n.png" width="200" />
  </a>
  <a href="https://scontent.fmnl4-6.fna.fbcdn.net/v/t1.15752-9/605860936_1816777752309145_5894943307934554595_n.png" target="_blank">
    <img src="https://scontent.fmnl4-6.fna.fbcdn.net/v/t1.15752-9/605860936_1816777752309145_5894943307934554595_n.png" width="200" />
  </a>
</p>

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

npm install
⚠️ If you encounter errors, make sure sqlite3 is installed on your PC. This system relies on your environment since it is not created using a virtual environment.

Build the system for Windows:

npm run build:win
Open the compiled executable:

dist/server.exe
The system is ready to use.
