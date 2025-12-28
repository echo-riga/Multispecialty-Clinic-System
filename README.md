# Multi-Specialty Clinic Management System

![Clinic System Thumbnail](thumbnail.png](https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/608428742_846778574807550_4880212780781955053_n.png?_nc_cat=100&ccb=1-7&_nc_sid=0024fc&_nc_ohc=KC0CuOwMuKAQ7kNvwHAR_Q1&_nc_oc=Adn-A7ihLX-6DVLfMihuyKvdGHdoqIY6TUSDiv9CKs5Vi2MDV8rekpEIPoUvutARlDrgKuQxvUrUeaje6btCxsRv&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.fmnl4-4.fna&oh=03_Q7cD4AF0-9ffkXak_GWmDInp0on8Ku0JNikPC0HUiBOoPcSlEg&oe=6978EE65)

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
