# 🏥 Multi-Specialty Clinic Management System

## 📌 Overview

The **Multi-Specialty Clinic Management System** is a desktop-based application designed to manage essential clinic operations efficiently. It supports appointment scheduling, patient record management, and medical document printing for multiple doctors and clinic staff.

The system maintains detailed patient profiles, including vital measurements and diagnosis history, ensuring organized, accurate, and accessible medical records.

---

## ✨ Key Features

### 📅 **Appointment Management**
- Schedule appointments for multiple doctors
- View and manage daily appointments
- Doctor-specific scheduling

### 👤 **Patient Record Management**
- Comprehensive patient profiles
- Diagnosis history tracking
- Complete medical record management

### 📊 **Patient Information Tracking**
| **Vital Measurement** | **Details** |
|----------------------|-------------|
| **Height** | Record and track patient height |
| **Weight** | Monitor weight changes over time |
| **BMI** | Automatic BMI calculation |
| **Blood Type** | Store blood type information |

### 🖨️ **Medical Document Printing**
- **Prescriptions** - Generate medication prescriptions
- **Laboratory Exam Requests** - Create lab test orders
- **Medical Certificates** - Issue official medical documents

### 🏢 **Clinic Operations**
- Centralized workflow management
- Multi-doctor support
- Staff coordination tools

---

## 🖼️ Screenshots

<div align="center">
  
### **Dashboard Overview**
<img src="screenshots/dashboard.png" width="48%" alt="Dashboard Interface" />
<img src="screenshots/patient-profile.png" width="48%" alt="Patient Profile" />

*Dashboard and Patient Profile interfaces showing clinic overview and detailed patient information.*

### **Core Functionalities**
<img src="screenshots/appointment.png" width="48%" alt="Appointment Scheduling" />
<img src="screenshots/prescription.png" width="48%" alt="Prescription Management" />

*Appointment scheduling system and prescription generation module.*

</div>

---

## 🛠️ Tech Stack

| **Layer** | **Technology** | **Purpose** |
|-----------|----------------|-------------|
| **Backend** | Node.js, Express | Server-side logic and API |
| **Frontend** | Bootstrap | Responsive user interface |
| **Database** | SQLite | Lightweight local data storage |
| **Platform** | Windows (Desktop) | Primary deployment target |

---

## 📁 Project Structure

```
project-root/
│
├── server/                 # Node.js backend
│   ├── node_modules/      # Dependencies
│   ├── src/               # Source code
│   ├── package.json       # Project configuration
│   └── ...               # Backend files
│
├── dist/                  # Compiled application
│   └── server.exe        # Windows executable
│
├── screenshots/           # Application visuals
│   ├── dashboard.png
│   ├── patient-profile.png
│   ├── appointment.png
│   └── prescription.png
│
└── README.md             # This documentation
```

---

## 🚀 Build & Run

### **1️⃣ Install Dependencies**
```bash
cd server
npm install
```

> **Note:** Ensure `sqlite3` is installed on your system. This project runs on the local environment and does not use a virtual environment.

### **2️⃣ Build for Windows**
```bash
npm run build:win
```

### **3️⃣ Run the Application**
```bash
dist/server.exe
```

---

## 📝 Important Notes

- ✅ **Desktop-Oriented**: Designed specifically for clinic desktop management
- ✅ **Lightweight Storage**: Uses SQLite for efficient local data management
- ✅ **Scalability**: Suitable for small to medium-sized clinics
- ✅ **Local Environment**: Operates entirely within local network/computer

---

<div align="center">
<strong>🚀 Ready for Efficient Clinic Management</strong>
</div>
