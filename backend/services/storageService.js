/**
 * Persistent Data Storage Service with User Database & Authentication Sessions
 */
const fs = require('fs');
const path = require('path');
const CryptoService = require('./cryptoService');

const DATA_FILE = path.join(__dirname, '../../sos_data.json');

class StorageService {
    constructor() {
        this.users = [];
        this.sessions = {};
        this.sosList = [
            {
                id: 'sos-demo-1',
                userId: 'usr-citizen-demo',
                citizenName: 'Amit Sharma',
                citizenPhone: '9876543210',
                emergencyContact: '9123456789',
                bloodGroup: 'O+',
                medicalNotes: 'Diabetic patient, elderly mother with him',
                lat: 25.5941,
                lng: 85.1376,
                condition: 'FLOOD_TRAPPED',
                district: 'Patna, Bihar',
                status: 'PENDING',
                landmark: 'Relief camp near river',
                floor: 2,
                timestamp: Date.now() - 3600000,
                hops: 2,
                source: 'BLE_MESH'
            },
            {
                id: 'sos-demo-2',
                userId: 'usr-citizen-demo-2',
                citizenName: 'Priya Verma',
                citizenPhone: '9811223344',
                emergencyContact: '9822334455',
                bloodGroup: 'B+',
                medicalNotes: 'Asthma patient, needs inhaler',
                lat: 26.1445,
                lng: 91.7362,
                condition: 'MEDICAL_CRITICAL',
                district: 'Guwahati, Assam',
                status: 'DISPATCHED',
                dispatchedBoat: 'NDRF-BOAT-09',
                landmark: 'Government hospital road',
                floor: 1,
                timestamp: Date.now() - 1800000,
                hops: 1,
                source: 'WEB_API'
            }
        ];

        this.teams = [
            { id: 'TEAM-01', name: 'Patna 9th Bn Team Alpha', battalion: '9th Bn (Patna)', status: 'READY', boats: 4, medics: 6 },
            { id: 'TEAM-02', name: 'Guwahati 1st Bn Team Bravo', battalion: '1st Bn (Guwahati)', status: 'DEPLOYED', boats: 2, medics: 4 },
            { id: 'TEAM-03', name: 'Arakkonam 4th Bn Team Charlie', battalion: '4th Bn (Arakkonam)', status: 'READY', boats: 5, medics: 8 },
            { id: 'TEAM-04', name: 'Pune 5th Bn Team Delta', battalion: '5th Bn (Pune)', status: 'READY', boats: 3, medics: 5 }
        ];

        this.seedInitialUsers();
        this.loadFromFile();
    }

    seedInitialUsers() {
        // Pre-seed Admin Commander
        const adminAuth = CryptoService.hashPassword('admin123');
        this.users.push({
            id: 'usr-admin-demo',
            name: 'Commander Rajesh Kumar (NDRF 9th Bn)',
            phone: '9999999999',
            email: 'admin@ndrf.gov.in',
            role: 'ADMIN',
            salt: adminAuth.salt,
            hash: adminAuth.hash,
            createdAt: new Date().toISOString()
        });

        // Pre-seed Citizen User
        const citizenAuth = CryptoService.hashPassword('citizen123');
        this.users.push({
            id: 'usr-citizen-demo',
            name: 'Amit Sharma',
            phone: '9876543210',
            email: 'amit.sharma@example.com',
            role: 'CITIZEN',
            bloodGroup: 'O+',
            emergencyContact: '9123456789',
            medicalNotes: 'Diabetic patient',
            salt: citizenAuth.salt,
            hash: citizenAuth.hash,
            createdAt: new Date().toISOString()
        });
    }

    loadFromFile() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed.users && parsed.users.length) this.users = parsed.users;
                if (parsed.sosList && parsed.sosList.length) this.sosList = parsed.sosList;
                if (parsed.teams && parsed.teams.length) this.teams = parsed.teams;
            }
        } catch (err) {
            console.warn("Storage load warning:", err.message);
        }
    }

    saveToFile() {
        try {
            const data = {
                users: this.users,
                sosList: this.sosList,
                teams: this.teams,
                lastSaved: new Date().toISOString()
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (err) {
            console.error("Storage save error:", err.message);
        }
    }

    // ================= USER DATABASE METHODS =================
    createUser(userData) {
        const existing = this.users.find(u => u.phone === userData.phone);
        if (existing) {
            throw new Error("Phone number is already registered!");
        }

        const { salt, hash } = CryptoService.hashPassword(userData.password);

        const newUser = {
            id: `usr-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            name: userData.name,
            phone: userData.phone,
            email: userData.email || '',
            role: userData.role || 'CITIZEN',
            bloodGroup: userData.bloodGroup || 'Unknown',
            emergencyContact: userData.emergencyContact || '',
            medicalNotes: userData.medicalNotes || '',
            salt,
            hash,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveToFile();
        return this.sanitizeUser(newUser);
    }

    authenticateUser(phone, password) {
        const user = this.users.find(u => u.phone === phone);
        if (!user) return null;

        const isValid = CryptoService.verifyPassword(password, user.salt, user.hash);
        if (!isValid) return null;

        // Create Session Token
        const token = CryptoService.generateToken();
        this.sessions[token] = {
            userId: user.id,
            role: user.role,
            createdAt: Date.now()
        };

        return { token, user: this.sanitizeUser(user) };
    }

    getUserByToken(token) {
        const session = this.sessions[token];
        if (!session) return null;
        const user = this.users.find(u => u.id === session.userId);
        return user ? this.sanitizeUser(user) : null;
    }

    getUserById(id) {
        const user = this.users.find(u => u.id === id);
        return user ? this.sanitizeUser(user) : null;
    }

    updateUserProfile(userId, updateData) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return null;

        if (updateData.name) user.name = updateData.name;
        if (updateData.bloodGroup) user.bloodGroup = updateData.bloodGroup;
        if (updateData.emergencyContact) user.emergencyContact = updateData.emergencyContact;
        if (updateData.medicalNotes) user.medicalNotes = updateData.medicalNotes;

        this.saveToFile();
        return this.sanitizeUser(user);
    }

    sanitizeUser(user) {
        const { salt, hash, ...clean } = user;
        return clean;
    }

    // ================= SOS & INCIDENT METHODS =================
    getAllSOS(userRole = 'GUEST') {
        // If user is ADMIN or COMMANDER, show full private PII details for rescue operations
        // If GUEST or CITIZEN, strip private contact details for privacy!
        return this.sosList.map(item => {
            if (userRole === 'ADMIN' || userRole === 'COMMANDER') {
                return item; // Full details for NDRF Command Center
            }
            // Strip private information for public maps
            const { citizenPhone, emergencyContact, medicalNotes, ...publicView } = item;
            return publicView;
        });
    }

    addSOS(sosPacket, user = null) {
        const newSos = {
            id: sosPacket.id || `sos-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            userId: user ? user.id : (sosPacket.userId || 'GUEST_CITIZEN'),
            citizenName: user ? user.name : (sosPacket.citizenName || 'Anonymous Citizen'),
            citizenPhone: user ? user.phone : (sosPacket.citizenPhone || 'N/A'),
            emergencyContact: user ? user.emergencyContact : (sosPacket.emergencyContact || 'N/A'),
            bloodGroup: user ? user.bloodGroup : (sosPacket.bloodGroup || 'N/A'),
            medicalNotes: user ? user.medicalNotes : (sosPacket.medicalNotes || 'N/A'),
            lat: parseFloat(sosPacket.lat),
            lng: parseFloat(sosPacket.lng),
            condition: sosPacket.condition || 'FLOOD_TRAPPED',
            district: sosPacket.district || 'Pan-India SOS Zone',
            status: 'PENDING',
            landmark: sosPacket.landmark || 'Unspecified',
            floor: parseInt(sosPacket.floor) || 0,
            timestamp: sosPacket.timestamp || Date.now(),
            hops: sosPacket.hops || 1,
            source: sosPacket.source || 'WEB_API'
        };

        this.sosList.unshift(newSos);
        this.saveToFile();
        return newSos;
    }

    dispatchBoat(sosId, boatName) {
        const item = this.sosList.find(s => s.id === sosId);
        if (item) {
            item.status = 'DISPATCHED';
            item.dispatchedBoat = boatName || 'NDRF-BOAT-01';
            item.dispatchedAt = Date.now();
            this.saveToFile();
            return item;
        }
        return null;
    }

    getTeams() {
        return this.teams;
    }

    getGovtMetrics() {
        const total = this.sosList.length;
        const pending = this.sosList.filter(s => s.status === 'PENDING').length;
        const dispatched = this.sosList.filter(s => s.status === 'DISPATCHED').length;
        const criticalMedical = this.sosList.filter(s => s.condition === 'MEDICAL_CRITICAL').length;

        return {
            totalSOS: total,
            pendingSOS: pending,
            dispatchedSOS: dispatched,
            criticalMedical,
            totalRegisteredUsers: this.users.length,
            availableTeams: this.teams.filter(t => t.status === 'READY').length,
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = new StorageService();
