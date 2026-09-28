# NDRF Nationwide Citizen SOS & Command Center System (Auth & Privacy Enabled)

Full-Stack Disaster Rescue Portal with User Authentication, Encrypted PII Privacy, Role-Based Access Control (RBAC), BLE Mesh Sync, Leaflet GIS Mapping, and SDMA Government Analytics.

---

## 🔒 Security & Privacy Features Included

1. **User Authentication & Role-Based Access**:
   - **CITIZEN Role**: Registration & Login with mobile number, password hashing (SHA-256 with salt), blood group, emergency contact, and medical history.
   - **ADMIN / NDRF COMMANDER Role**: Verified NDRF officers can log in to view full victim profiles (Name, Phone, Medical notes, Blood group) to execute targeted rescue missions.
   - **PUBLIC / GUEST Role**: Map feed automatically redacts sensitive citizen PII (phone number, medical notes) to protect privacy from public exposure.

2. **Database Persistence**:
   - Persistent User Database & Session tokens stored in `sos_data.json`.

---

## 📁 Directory Structure

```
sos/
├── package.json                   # Node.js project manifest
├── README.md                      # Documentation
├── sos_data.json                  # Persistent database store (Users, Sessions, Incidents)
│
├── backend/                       # REST API & Auth Server
│   ├── server.js                  # Express/Node server (Zero-dependency)
│   ├── controllers/
│   │   ├── authController.js      # Register, Login, Session & Profile APIs
│   │   └── sosController.js       # SOS incident triage & boat dispatch
│   ├── routes/
│   │   ├── authRoutes.js          # Authentication routes (/api/auth/*)
│   │   └── sosRoutes.js           # Incident & team routes (/api/sos/*)
│   └── services/
│       ├── cryptoService.js       # Password hashing & session token generator
│       ├── meshService.js         # 16-Byte BLE mesh binary packet encoder/decoder
│       └── storageService.js      # User DB & Role-based PII privacy filter
│
└── frontend/                      # Web App Interfaces
    ├── login.html                 # 🔑 Login & Registration Portal (Citizen & Admin)
    ├── citizen_app.html           # 📱 Citizen Emergency SOS App
    ├── command_center.html        # 🚤 NDRF Tactical Command GIS Dashboard
    ├── govt_portal.html           # 🏛️ Govt SDMA Report Panel
    ├── manifest.json              # Web App Manifest
    ├── sw.js                      # Offline Service Worker
    │
    ├── css/
    │   └── styles.css             # Custom styles & strobe animations
    │
    └── js/
        ├── auth.js                # Auth state, local token manager & user badge renderer
        ├── citizen_app.js         # Citizen app logic (GPS, 2800Hz whistle, strobe)
        ├── command_center.js      # GIS map & boat dispatch controller
        ├── govt_portal.js         # SDMA analytics & CSV/JSON report exporter
        ├── mesh_network.js        # BLE mesh P2P sync
        ├── i18n.js                # 11 Indian languages dictionary
        └── ndrf_directory.js      # 16 NDRF Battalions directory
```

---

## ⚡ Quick Test Demo Accounts

| Role | Mobile Number | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| 👤 **Citizen User** | `9876543210` | `citizen123` | Sends authenticated SOS signals with medical notes & emergency contact |
| 🛡️ **NDRF Commander** | `9999999999` | `admin123` | Accesses full private victim PII, dispatches rescue boats, manages teams |

---

## 🚀 How to Run the System

```bash
node backend/server.js
```

### 🌐 Access Links in Browser:
- **🔑 Login Portal**: [http://localhost:8000/login.html](http://localhost:8000/login.html)
- **📱 Citizen SOS App**: [http://localhost:8000/citizen_app.html](http://localhost:8000/citizen_app.html)
- **🚤 Command Center GIS**: [http://localhost:8000/command_center.html](http://localhost:8000/command_center.html)
- **🏛️ Govt SDMA Portal**: [http://localhost:8000/govt_portal.html](http://localhost:8000/govt_portal.html)
