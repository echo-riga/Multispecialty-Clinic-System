# Multi-Specialty Clinic Management System

## Thumbnail / Demo
A visual overview of the system:

![Clinic System Thumbnail 1](https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/608428742_846778574807550_4880212780781955053_n.png?_nc_cat=100&ccb=1-7&_nc_sid=0024fc&_nc_ohc=KC0CuOwMuKAQ7kNvwHAR_Q1&_nc_oc=Adn-A7ihLX-6DVLfMihuyKvdGHdoqIY6TUSDiv9CKs5Vi2MDV8rekpEIPoUvutARlDrgKuQxvUrUeaje6btCxsRv&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.fmnl4-4.fna&oh=03_Q7cD4AF0-9ffkXak_GWmDInp0on8Ku0JNikPC0HUiBOoPcSlEg&oe=6978EE65)
![Clinic System Thumbnail 2](https://scontent.fmnl4-4.fna.fbcdn.net/v/t1.15752-9/605831623_1425401779191702_5554333328950806019_n.png?stp=dst-png_s640x640&_nc_cat=100&ccb=1-7&_nc_sid=0024fc&_nc_ohc=To2kT7wDkCMQ7kNvwFJK3JW&_nc_oc=Adl35_umQ7NWtyhyiMea2bqeYVPR321Rrt7hHgi2D_x8slvTyVVMisL6vtxoMv8vrRJvnsNdrTpIk4-T1j2FqzVK&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.fmnl4-4.fna&oh=03_Q7cD4AFD-iAEtMSjHI14K_0190oJyyCvlo1dq_LNeC0LqQjR-Q&oe=6978DB8D)
![Clinic System Thumbnail 3](https://scontent.fmnl4-7.fna.fbcdn.net/v/t1.15752-9/605135623_1889208815322055_3091992793292127559_n.png?stp=dst-png_s640x640&_nc_cat=108&ccb=1-7&_nc_sid=0024fc&_nc_ohc=we99NDLyzdQQ7kNvwEz5JQQ&_nc_oc=AdkwJufA_EXCOe-SClWj8zipF9kvrYs6qcCYui1F2T9viK9dYszzgtQtIvfGKFOQJgGjg_bxofa8mrTY2UscgIvd&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.fmnl4-7.fna&oh=03_Q7cD4AEX3qQO-s5H0rp6eJHRaBJmC7EWTW1AKu2SWsa_9OR4PA&oe=6978D5AB)
![Clinic System Thumbnail 4](https://scontent.fmnl4-6.fna.fbcdn.net/v/t1.15752-9/605860936_1816777752309145_5894943307934554595_n.png?stp=dst-png_s640x640&_nc_cat=107&ccb=1-7&_nc_sid=0024fc&_nc_ohc=JHAMWeogOkkQ7kNvwH9IxFO&_nc_oc=Adm9v0IIWp9PoD5W0BThkkEcqeCydQCGZqZWOY22gUPnYXV_A6vxokOzrIffJfWqCr14ODNvvGC8txUubiAPM6uR&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.fmnl4-6.fna&oh=03_Q7cD4AFn9a7NHOKh6RPczqyke62pmdvjQ2Ix-JG5MdTa4QOQsg&oe=6978ED14))


---

## Overview
The **Multi-Specialty Clinic Management System** 100% digitizes an exclusive clinic workflow. It manages appointments, patient records, and printing of prescriptions, laboratory exams, and certificates. The system streamlines operations for multiple doctors and clinic staff.

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
