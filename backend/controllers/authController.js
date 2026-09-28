/**
 * Authentication Controller - Handles User Auth, Registration & Sessions
 */
const storageService = require('../services/storageService');

class AuthController {
    /**
     * Register a new Citizen or NDRF Official
     */
    register(req, res) {
        try {
            const { name, phone, password, role, bloodGroup, emergencyContact, medicalNotes } = req.body;

            if (!name || !phone || !password) {
                return res.status(400).json({ success: false, error: "Name, Phone, and Password are required fields." });
            }

            const user = storageService.createUser({
                name, phone, password, role, bloodGroup, emergencyContact, medicalNotes
            });

            // Automatically log in user after registration
            const authResult = storageService.authenticateUser(phone, password);

            res.status(201).json({
                success: true,
                message: "User registered successfully",
                token: authResult.token,
                user: authResult.user
            });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    /**
     * Login User with Phone & Password
     */
    login(req, res) {
        try {
            const { phone, password } = req.body;

            if (!phone || !password) {
                return res.status(400).json({ success: false, error: "Phone and Password are required." });
            }

            const authResult = storageService.authenticateUser(phone, password);
            if (!authResult) {
                return res.status(401).json({ success: false, error: "Invalid Phone Number or Password" });
            }

            res.json({
                success: true,
                message: "Login successful",
                token: authResult.token,
                user: authResult.user
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Get Current Authenticated User Details
     */
    getMe(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader ? authHeader.replace('Bearer ', '') : null;

            if (!token) {
                return res.status(401).json({ success: false, error: "No authentication token provided." });
            }

            const user = storageService.getUserByToken(token);
            if (!user) {
                return res.status(401).json({ success: false, error: "Session expired or invalid token." });
            }

            res.json({ success: true, user });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * Update User Profile (Medical notes, Emergency contact, Blood group)
     */
    updateProfile(req, res) {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader ? authHeader.replace('Bearer ', '') : null;

            if (!token) {
                return res.status(401).json({ success: false, error: "No authentication token provided." });
            }

            const currentUser = storageService.getUserByToken(token);
            if (!currentUser) {
                return res.status(401).json({ success: false, error: "Unauthorized session." });
            }

            const updatedUser = storageService.updateUserProfile(currentUser.id, req.body);
            res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new AuthController();
