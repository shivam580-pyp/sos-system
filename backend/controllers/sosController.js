/**
 * NDRF SOS Controller - Handles API Logic with Auth & PII Privacy
 */
const storageService = require('../services/storageService');
const MeshService = require('../services/meshService');

class SosController {
    /**
     * Get all active SOS requests (Filters sensitive PII for non-admins)
     */
    getSOSList(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader ? authHeader.replace('Bearer ', '') : null;
            let userRole = 'GUEST';

            if (token) {
                const user = storageService.getUserByToken(token);
                if (user) userRole = user.role;
            }

            const list = storageService.getAllSOS(userRole);
            res.json({ success: true, count: list.length, role: userRole, data: list });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Submit a new SOS request (Attaches authenticated citizen details)
     */
    createSOS(req, res) {
        try {
            const { lat, lng, condition, district, landmark, floor, hops, source } = req.body;

            if (!lat || !lng) {
                return res.status(400).json({ success: false, error: "Latitude and Longitude are required" });
            }

            // Extract optional authenticated user
            const authHeader = req.headers['authorization'];
            const token = authHeader ? authHeader.replace('Bearer ', '') : null;
            let user = null;
            if (token) {
                user = storageService.getUserByToken(token);
            }

            const sos = storageService.addSOS({
                lat, lng, condition, district, landmark, floor, hops, source
            }, user);

            res.status(201).json({ success: true, message: "SOS Broadcast Logged Successfully", data: sos });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Receive raw 16-Byte BLE Mesh Buffer
     */
    receiveMeshPacket(req, res) {
        try {
            const rawData = req.body.buffer || req.body;
            let buffer;

            if (typeof rawData === 'string') {
                buffer = Buffer.from(rawData, 'base64').buffer;
            } else if (Array.isArray(rawData)) {
                buffer = new Uint8Array(rawData).buffer;
            } else {
                buffer = req.body;
            }

            const decoded = MeshService.decodePacket(buffer);
            const sos = storageService.addSOS(decoded);

            res.status(200).json({ success: true, decoded, data: sos });
        } catch (err) {
            res.status(400).json({ success: false, error: "Mesh Packet Decode Error: " + err.message });
        }
    }

    /**
     * Dispatch rescue boat to an emergency site
     */
    dispatchRescueBoat(req, res) {
        try {
            const { sosId, boatName } = req.body;

            if (!sosId) {
                return res.status(400).json({ success: false, error: "sosId is required" });
            }

            const updated = storageService.dispatchBoat(sosId, boatName);
            if (!updated) {
                return res.status(404).json({ success: false, error: "SOS ID not found" });
            }

            res.json({ success: true, message: `Boat ${boatName || 'NDRF-BOAT-01'} Dispatched`, data: updated });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Get list of NDRF rescue teams and equipment availability
     */
    getTeams(req, res) {
        try {
            const teams = storageService.getTeams();
            res.json({ success: true, data: teams });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Get Government SDMA Reporting Data
     */
    getGovtReport(req, res) {
        try {
            const metrics = storageService.getGovtMetrics();
            res.json({ success: true, data: metrics });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new SosController();
