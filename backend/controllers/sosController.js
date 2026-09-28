/**
 * NDRF SOS Controller - Handles API Logic with Real-time Nearest Team & Citizen Live Tracking
 */
const storageService = require('../services/storageService');
const MeshService = require('../services/meshService');

class SosController {
    /**
     * Get all active SOS requests (Enriched with Nearest NDRF Team calculations)
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
     * Get Citizen's active SOS status & live rescue boat movement tracking
     */
    getUserActiveSOS(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader ? authHeader.replace('Bearer ', '') : null;
            let user = null;

            if (token) {
                user = storageService.getUserByToken(token);
            }

            const sos = storageService.getSOSForUser(user ? user.id : 'GUEST_CITIZEN');
            res.json({ success: true, data: sos || null });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Submit a new SOS request (Automatically finds nearest NDRF Team via Haversine)
     */
    createSOS(req, res) {
        try {
            const { lat, lng, condition, district, landmark, floor, hops, source } = req.body;

            if (!lat || !lng) {
                return res.status(400).json({ success: false, error: "Latitude and Longitude are required" });
            }

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
     * Dispatch nearest rescue boat to an emergency site
     */
    dispatchRescueBoat(req, res) {
        try {
            const { sosId, boatName, assignedTeamId } = req.body;

            if (!sosId) {
                return res.status(400).json({ success: false, error: "sosId is required" });
            }

            const updated = storageService.dispatchBoat(sosId, boatName, assignedTeamId);
            if (!updated) {
                return res.status(404).json({ success: false, error: "SOS ID not found" });
            }

            res.json({ success: true, message: `Boat ${boatName || 'NDRF-BOAT-01'} Dispatched`, data: updated });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Get list of nationwide NDRF Battalions & Teams
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
