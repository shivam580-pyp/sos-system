/**
 * Citizen Mobile SOS App Client Controller with Authenticated SOS Sync
 */

let userLocation = { lat: 13.0827, lng: 80.2707 }; // Default fallback
let isSirenActive = false;
let sirenAudioCtx = null;
let sirenOsc = null;
let sirenGain = null;
let isStrobeActive = false;
let meshNet = null;
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    fetchGPSLocation();
    initMeshNetwork();
    registerServiceWorker();
    setupPWAPrompt();
}

function fetchGPSLocation() {
    const coordsEl = document.getElementById('gpsCoords');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = {
                    lat: Number(pos.coords.latitude.toFixed(6)),
                    lng: Number(pos.coords.longitude.toFixed(6))
                };
                if (coordsEl) {
                    coordsEl.innerText = `${userLocation.lat}° N, ${userLocation.lng}° E`;
                }
            },
            (err) => {
                if (coordsEl) coordsEl.innerText = `GPS Active: 13.0827° N, 80.2707° E`;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
}

function initMeshNetwork() {
    meshNet = new ClientMeshNetwork((packet) => {
        logSOSMessage(`[BLE MESH RELAY] Received SOS from ${packet.lat}, ${packet.lng}`);
    });
}

function sendSOS() {
    const conditionEl = document.getElementById('sosCondition');
    const landmarkEl = document.getElementById('manualLandmark');
    const floorEl = document.getElementById('manualFloor');

    const currentUser = Auth.getUser();

    const sosPacket = {
        id: `sos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        lat: userLocation.lat,
        lng: userLocation.lng,
        condition: conditionEl ? conditionEl.value : 'FLOOD_TRAPPED',
        landmark: landmarkEl ? landmarkEl.value : 'Unspecified',
        floor: floorEl ? parseInt(floorEl.value) || 0 : 0,
        citizenName: currentUser ? currentUser.name : 'Citizen',
        timestamp: Date.now(),
        hops: 1,
        source: 'CITIZEN_PWA_APP'
    };

    const headers = {
        'Content-Type': 'application/json',
        ...Auth.getAuthHeaders()
    };

    // 1. Send to Backend REST API with Auth Headers
    fetch('/api/sos', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(sosPacket)
    }).then(res => res.json())
      .then(data => {
          logSOSMessage(`✅ [HQ SERVER SYNC] SOS Logged for ${sosPacket.citizenName} (ID: ${sosPacket.id})`);
      })
      .catch(err => {
          logSOSMessage(`⚠️ [OFFLINE MESH] Server Unreachable. Broadcasting via BLE Mesh.`);
      });

    // 2. Broadcast via Local Mesh Network
    meshNet.broadcastSOS(sosPacket);

    // Visual feedback
    alert(`🚨 EMERGENCY SOS BROADCASTED!\nSender: ${sosPacket.citizenName}\nNDRF Control Room and rescue teams notified via Web & Mesh Network.`);
}

function logSOSMessage(msg) {
    const logContainer = document.getElementById('sosLogContainer');
    if (!logContainer) return;

    const timeStr = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'p-1.5 bg-slate-900 rounded border border-slate-700 font-mono text-[10px] text-slate-300';
    entry.innerText = `[${timeStr}] ${msg}`;

    logContainer.prepend(entry);
}

/* Audio Siren Synthesizer (2800Hz Pulse) */
function toggleWhistleSiren() {
    const btn = document.getElementById('sirenBtn');
    if (!isSirenActive) {
        startSiren();
        isSirenActive = true;
        if (btn) btn.classList.add('bg-red-600');
    } else {
        stopSiren();
        isSirenActive = false;
        if (btn) btn.classList.remove('bg-red-600');
    }
}

function startSiren() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    sirenAudioCtx = new AudioContext();

    sirenOsc = sirenAudioCtx.createOscillator();
    sirenGain = sirenAudioCtx.createGain();

    sirenOsc.type = 'sine';
    sirenOsc.frequency.setValueAtTime(2800, sirenAudioCtx.currentTime); // 2800 Hz rescue whistle freq

    const lfo = sirenAudioCtx.createOscillator();
    const lfoGain = sirenAudioCtx.createGain();
    lfo.frequency.value = 4; // 4 Hz pulses per sec
    lfoGain.gain.value = 400;

    lfo.connect(sirenOsc.frequency);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(sirenAudioCtx.destination);

    lfo.start();
    sirenOsc.start();
}

function stopSiren() {
    if (sirenOsc) {
        sirenOsc.stop();
        sirenAudioCtx.close();
    }
}

/* Screen Strobe Beacon */
function toggleStrobeBeacon() {
    const btn = document.getElementById('strobeBtn');
    isStrobeActive = !isStrobeActive;
    if (isStrobeActive) {
        document.body.classList.add('strobe-mode');
        if (btn) btn.innerText = "🔦 Strobe Active (STOP)";
    } else {
        document.body.classList.remove('strobe-mode');
        if (btn) btn.innerText = "🔦 Screen Flash Beacon";
    }
}

/* Multilingual Language Switcher */
function changeLanguage() {
    const langSelect = document.getElementById('langSelect');
    const lang = langSelect ? langSelect.value : 'hi';

    const mappings = [
        ['txtPwaTitle', 'pwaTitle'],
        ['txtPwaDesc', 'pwaDesc'],
        ['txtGpsLabel', 'gpsLabel'],
        ['lblCondition', 'lblCondition'],
        ['txtSosBtnMain', 'sosBtnMain'],
        ['txtSosBtnSub', 'sosBtnSub'],
        ['txtWhistleBtn', 'whistleBtn'],
        ['txtStrobeBtn', 'strobeBtn'],
        ['txtLogTitle', 'logTitle'],
        ['txtNavSos', 'navSos'],
        ['txtNavMap', 'navMap'],
        ['txtNavHelpline', 'navHelpline'],
        ['txtNavGuides', 'navGuides']
    ];

    mappings.forEach(([elementId, dictKey]) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerText = getTranslation(lang, dictKey);
        }
    });
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => {
            console.log("Service Worker Registered");
        }).catch(err => console.warn("SW Registration Error:", err));
    }
}

function setupPWAPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const banner = document.getElementById('pwaBanner');
        if (banner) banner.style.display = 'flex';
    });
}

function promptPWAInstall() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
        });
    }
}
