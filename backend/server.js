const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const sosController = require('./controllers/sosController');
const authController = require('./controllers/authController');

const PORT = process.env.PORT || 8000;
const FRONTEND_DIR = path.join(__dirname, '../frontend');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    const getJsonBody = (callback) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                callback(null, parsed);
            } catch (err) {
                callback(err, null);
            }
        });
    };

    res.json = (data, statusCode = 200) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    res.status = (code) => {
        return {
            json: (data) => res.json(data, code)
        };
    };

    // ================= AUTH ENDPOINTS =================
    if (pathname === '/api/auth/register' && req.method === 'POST') {
        return getJsonBody((err, body) => {
            if (err) return res.status(400).json({ success: false, error: 'Invalid JSON' });
            req.body = body;
            authController.register(req, res);
        });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
        return getJsonBody((err, body) => {
            if (err) return res.status(400).json({ success: false, error: 'Invalid JSON' });
            req.body = body;
            authController.login(req, res);
        });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
        return authController.getMe(req, res);
    }

    if (pathname === '/api/auth/profile' && req.method === 'POST') {
        return getJsonBody((err, body) => {
            if (err) return res.status(400).json({ success: false, error: 'Invalid JSON' });
            req.body = body;
            authController.updateProfile(req, res);
        });
    }

    // ================= SOS & DISASTER ENDPOINTS =================
    if (pathname === '/api/health' && req.method === 'GET') {
        return res.json({
            status: 'UP',
            service: 'NDRF Disaster Rescue Backend Server',
            timestamp: new Date().toISOString(),
            meshNodeId: 'NDRF-HQ-NODE-01'
        });
    }

    if (pathname === '/api/sos' && req.method === 'GET') {
        return sosController.getSOSList(req, res);
    }

    if (pathname === '/api/sos/my-status' && req.method === 'GET') {
        return sosController.getUserActiveSOS(req, res);
    }

    if (pathname === '/api/sos' && req.method === 'POST') {
        return getJsonBody((err, body) => {
            if (err) return res.status(400).json({ success: false, error: 'Invalid JSON' });
            req.body = body;
            sosController.createSOS(req, res);
        });
    }

    if (pathname === '/api/sos/dispatch' && req.method === 'POST') {
        return getJsonBody((err, body) => {
            if (err) return res.status(400).json({ success: false, error: 'Invalid JSON' });
            req.body = body;
            sosController.dispatchRescueBoat(req, res);
        });
    }

    if (pathname === '/api/teams' && req.method === 'GET') {
        return sosController.getTeams(req, res);
    }

    if (pathname === '/api/govt-report' && req.method === 'GET') {
        return sosController.getGovtReport(req, res);
    }

    // ================= STATIC FILE SERVING =================
    let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'citizen_app.html' : pathname);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚨 NDRF Nationwide Rescue Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔑 Login Portal:           http://localhost:${PORT}/login.html`);
    console.log(`📱 Citizen Mobile SOS App: http://localhost:${PORT}/citizen_app.html`);
    console.log(`🚤 Command Center GIS:      http://localhost:${PORT}/command_center.html`);
    console.log(`🏛️ Govt SDMA Portal:         http://localhost:${PORT}/govt_portal.html`);
    console.log(`=================================================`);
});
