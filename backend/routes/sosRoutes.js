const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');

// SOS CRUD & Mesh Sync
router.get('/sos', (req, res) => sosController.getSOSList(req, res));
router.post('/sos', (req, res) => sosController.createSOS(req, res));
router.post('/sos/mesh', (req, res) => sosController.receiveMeshPacket(req, res));
router.post('/sos/dispatch', (req, res) => sosController.dispatchRescueBoat(req, res));

// Team & Equipment Status
router.get('/teams', (req, res) => sosController.getTeams(req, res));

// Government SDMA Reporting
router.get('/govt-report', (req, res) => sosController.getGovtReport(req, res));

module.exports = router;
