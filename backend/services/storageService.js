/**
 * Persistent Data Storage Service with Full Database Persistence (Users, Sessions, SOS Incidents, Teams)
 */
const fs = require('fs');
const path = require('path');
const CryptoService = require('./cryptoService');
const GeoService = require('./geoService');

const DATA_FILE = path.join(__dirname, '../../sos_data.json');

class StorageService {
    constructor() {
        this.users = [];
        this.sessions = {};

        this.teams = [
            { id: 'BN-09-PATNA', name: 'NDRF 9th Bn - Patna/Bihta', battalion: '9th Bn', state: 'Bihar', lat: 25.5941, lng: 85.1376, status: 'READY', boats: 8, medics: 12, phone: '06115-252101' },
            { id: 'BN-01-GUWAHATI', name: 'NDRF 1st Bn - Guwahati', battalion: '1st Bn', state: 'Assam & North-East', lat: 26.1445, lng: 91.7362, status: 'READY', boats: 10, medics: 15, phone: '0361-2840138' },
            { id: 'BN-02-WESTBENGAL', name: 'NDRF 2nd Bn - Haringhata', battalion: '2nd Bn', state: 'West Bengal & Sikkim', lat: 22.9575, lng: 88.5422, status: 'READY', boats: 6, medics: 10, phone: '033-25875032' },
            { id: 'BN-03-ODISHA', name: 'NDRF 3rd Bn - Mundali', battalion: '3rd Bn', state: 'Odisha & Chhattisgarh', lat: 20.4625, lng: 85.8828, status: 'READY', boats: 7, medics: 11, phone: '0671-2879710' },
            { id: 'BN-04-ARAKKONAM', name: 'NDRF 4th Bn - Arakkonam', battalion: '4th Bn', state: 'Tamil Nadu & Kerala', lat: 13.0827, lng: 79.6678, status: 'READY', boats: 9, medics: 14, phone: '044-27926410' },
            { id: 'BN-05-PUNE', name: 'NDRF 5th Bn - Pune', battalion: '5th Bn', state: 'Maharashtra & Goa', lat: 18.5204, lng: 73.8567, status: 'READY', boats: 8, medics: 12, phone: '02114-247000' },
            { id: 'BN-06-VADODARA', name: 'NDRF 6th Bn - Vadodara', battalion: '6th Bn', state: 'Gujarat', lat: 22.3072, lng: 73.1812, status: 'READY', boats: 5, medics: 8, phone: '0265-2488123' },
            { id: 'BN-08-GHAZIABAD', name: 'NDRF 8th Bn - Ghaziabad', battalion: '8th Bn', state: 'Delhi NCR & UP', lat: 28.6692, lng: 77.4538, status: 'READY', boats: 8, medics: 12, phone: '0120-2766618' },
            { id: 'BN-10-VIJAYAWADA', name: 'NDRF 10th Bn - Vijayawada', battalion: '10th Bn', state: 'Andhra Pradesh & Telangana', lat: 16.5062, lng: 80.6480, status: 'READY', boats: 6, medics: 10, phone: '0863-2293111' },
            { id: 'BN-16-BENGALURU', name: 'NDRF 16th Bn - Bengaluru', battalion: '16th Bn', state: 'Karnataka', lat: 12.9716, lng: 77.5946, status: 'READY', boats: 6, medics: 9, phone: '080-28391111' },
            { id: 'BN-NEPAL-BORDER', name: 'NDRF Border Base - Raxaul/Nepal Border', battalion: '9th Bn Sub-Base', state: 'Nepal Border Sector', lat: 26.9800, lng: 84.8500, status: 'READY', boats: 4, medics: 6, phone: '06115-252101' }
        ];

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
            }
        ];

        this.seedInitialUsers();
        this.loadFromFile();
        this.startLiveBoatMovementSimulator();
    }

    seedInitialUsers() {
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
                if (parsed.users && parsed.users.length) {
                    // Merge persistent users with seeded defaults to ensure no loss
                    parsed.users.forEach(u => {
                        if (!this.users.some(existing => existing.id === u.id || existing.phone === u.phone)) {
                            this.users.push(u);
                        }
                    });
                }
                if (parsed.sessions) this.sessions = parsed.sessions;
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
                sessions: this.sessions,
                sosList: this.sosList,
                teams: this.teams,
                lastSaved: new Date().toISOString()
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (err) {
            console.error("Storage save error:", err.message);
        }
    }

    // ================= USER & AUTH METHODS =================
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

        const token = CryptoService.generateToken();
        this.sessions[token] = {
            userId: user.id,
            role: user.role,
            createdAt: Date.now()
        };

        this.saveToFile();
        return { token, user: this.sanitizeUser(user) };
    }

    getUserByToken(token) {
        if (!token) return null;
        const session = this.sessions[token];
        if (!session) return null;
        const user = this.users.find(u => u.id === session.userId);
        return user ? this.sanitizeUser(user) : null;
    }

    sanitizeUser(user) {
        const { salt, hash, ...clean } = user;
        return clean;
    }

    // ================= SOS & DISPATCH METHODS =================
    getAllSOS(userRole = 'GUEST') {
        return this.sosList.map(item => {
            const nearestTeam = GeoService.findNearestTeam(item.lat, item.lng, this.teams);
            const enriched = { ...item, nearestTeam };

            // If user is ADMIN or COMMANDER, show full private PII details for rescue operations
            if (userRole === 'ADMIN' || userRole === 'COMMANDER') {
                return enriched;
            }

            // Public view: Redact phone & emergency notes for non-admin viewers
            const { citizenPhone, emergencyContact, medicalNotes, ...publicView } = enriched;
            return publicView;
        });
    }

    addSOS(sosPacket, user = null) {
        const lat = parseFloat(sosPacket.lat);
        const lng = parseFloat(sosPacket.lng);
        const nearestTeam = GeoService.findNearestTeam(lat, lng, this.teams);

        // Priority resolution: Authenticated User > Body Params > Fallback
        const citizenName = user ? user.name : (sosPacket.citizenName && sosPacket.citizenName !== 'Citizen' ? sosPacket.citizenName : 'Anonymous Citizen');
        const citizenPhone = user ? user.phone : (sosPacket.citizenPhone && sosPacket.citizenPhone !== 'N/A' ? sosPacket.citizenPhone : 'N/A');
        const emergencyContact = user ? user.emergencyContact : (sosPacket.emergencyContact || 'N/A');
        const bloodGroup = user ? user.bloodGroup : (sosPacket.bloodGroup || 'N/A');
        const medicalNotes = user ? user.medicalNotes : (sosPacket.medicalNotes || 'N/A');
        const userId = user ? user.id : (sosPacket.userId || 'GUEST_CITIZEN');

        const newSos = {
            id: sosPacket.id || `sos-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            userId,
            citizenName,
            citizenPhone,
            emergencyContact,
            bloodGroup,
            medicalNotes,
            lat,
            lng,
            condition: sosPacket.condition || 'FLOOD_TRAPPED',
            district: sosPacket.district || 'Pan-India SOS Zone',
            status: 'PENDING',
            landmark: sosPacket.landmark || 'Unspecified',
            floor: parseInt(sosPacket.floor) || 0,
            timestamp: sosPacket.timestamp || Date.now(),
            hops: sosPacket.hops || 1,
            source: sosPacket.source || 'WEB_API',
            nearestTeam
        };

        this.sosList.unshift(newSos);
        this.saveToFile();
        return newSos;
    }

    dispatchBoat(sosId, boatName, assignedTeamId) {
        const item = this.sosList.find(s => s.id === sosId);
        if (item) {
            const team = this.teams.find(t => t.id === assignedTeamId) || item.nearestTeam || this.teams[0];

            item.status = 'DISPATCHED';
            item.dispatchedBoat = boatName || 'NDRF-RESCUE-BOAT-01';
            item.assignedTeamName = team.name;
            item.dispatchedAt = Date.now();
            
            item.boatLat = team.lat;
            item.boatLng = team.lng;
            item.distanceToVictimKm = GeoService.calculateDistanceKm(item.lat, item.lng, item.boatLat, item.boatLng);
            item.etaMinutes = Math.max(2, Math.round(item.distanceToVictimKm * 2.5));

            this.saveToFile();
            return item;
        }
        return null;
    }

    getSOSForUser(userId) {
        return this.sosList.find(s => s.userId === userId || s.id === userId);
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

    startLiveBoatMovementSimulator() {
        setInterval(() => {
            let updated = false;
            this.sosList.forEach(sos => {
                if (sos.status === 'DISPATCHED' && sos.boatLat && sos.boatLng) {
                    const dLat = sos.lat - sos.boatLat;
                    const dLng = sos.lng - sos.boatLng;
                    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

                    if (dist > 0.001) {
                        sos.boatLat += dLat * 0.08;
                        sos.boatLng += dLng * 0.08;
                        sos.distanceToVictimKm = GeoService.calculateDistanceKm(sos.lat, sos.lng, sos.boatLat, sos.boatLng);
                        sos.etaMinutes = Math.max(1, Math.round(sos.distanceToVictimKm * 2.5));
                        updated = true;
                    } else {
                        sos.status = 'RESCUE_IN_PROGRESS';
                        sos.etaMinutes = 0;
                        updated = true;
                    }
                }
            });

            if (updated) this.saveToFile();
        }, 3000);
    }
}

module.exports = new StorageService();
