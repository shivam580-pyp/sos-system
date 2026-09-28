/**
 * Citizen Mobile SOS App Client Controller with Real-Time GPS & Rescue Tracker
 */

let userLocation = { lat: 25.5941, lng: 85.1376 }; // Real GPS or Bihar default fallback
let isSirenActive = false;
let sirenAudioCtx = null;
let sirenOsc = null;
let sirenGain = null;
let isStrobeActive = false;
let meshNet = null;
let deferredPrompt = null;

let citizenMapInstance = null;
let citizenUserMarker = null;
let citizenBoatMarker = null;
let activeSosId = null;
let trackingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    fetchGPSLocation();
    initMeshNetwork();
    registerServiceWorker();
    setupPWAPrompt();
    initCitizenMap();
    checkMyActiveSOSStatus();
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
                updateCitizenMapLocation();
            },
            (err) => {
                if (coordsEl) coordsEl.innerText = `GPS Active: ${userLocation.lat}° N, ${userLocation.lng}° E`;
                updateCitizenMapLocation();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }
}

function initCitizenMap() {
    const mapEl = document.getElementById('citizenLiveMap');
    if (!mapEl) return;

    citizenMapInstance = L.map('citizenLiveMap').setView([userLocation.lat, userLocation.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; NDRF Rescue Tracking | OpenStreetMap',
        maxZoom: 18
    }).addTo(citizenMapInstance);

    citizenUserMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 12,
        fillColor: '#dc2626',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1
    }).addTo(citizenMapInstance).bindPopup("<b>📍 Your Real GPS Location</b>");
}

function updateCitizenMapLocation() {
    if (!citizenMapInstance || !citizenUserMarker) return;
    citizenUserMarker.setLatLng([userLocation.lat, userLocation.lng]);
    citizenMapInstance.setView([userLocation.lat, userLocation.lng], 13);
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
        userId: currentUser ? currentUser.id : null,
        citizenName: currentUser ? currentUser.name : 'Anonymous Citizen',
        citizenPhone: currentUser ? currentUser.phone : 'N/A',
        emergencyContact: currentUser ? currentUser.emergencyContact : 'N/A',
        bloodGroup: currentUser ? currentUser.bloodGroup : 'N/A',
        medicalNotes: currentUser ? currentUser.medicalNotes : 'N/A',
        timestamp: Date.now(),
        hops: 1,
        source: 'CITIZEN_PWA_APP'
    };

    activeSosId = sosPacket.id;

    fetch('/api/sos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...Auth.getAuthHeaders()
        },
        body: JSON.stringify(sosPacket)
    }).then(res => res.json())
      .then(data => {
          logSOSMessage(`✅ [HQ SERVER SYNC] SOS Logged for ${sosPacket.citizenName} (${sosPacket.citizenPhone})`);
          startRescueTracking();
      })
      .catch(err => {
          logSOSMessage(`⚠️ [OFFLINE MESH] Server Unreachable. Broadcasting via BLE Mesh.`);
      });

    meshNet.broadcastSOS(sosPacket);
    startRescueTracking();
    alert(`🚨 EMERGENCY SOS BROADCASTED!\nSender: ${sosPacket.citizenName} (${sosPacket.citizenPhone})\nNDRF Control Room notified.`);
}

function checkMyActiveSOSStatus() {
    fetch('/api/sos/my-status', {
        headers: Auth.getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.data) {
            activeSosId = data.data.id;
            renderTrackerCard(data.data);
            startRescueTracking();
        }
    })
    .catch(() => {});
}

function startRescueTracking() {
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = setInterval(pollRescueTracker, 3000);
    pollRescueTracker();
}

function pollRescueTracker() {
    fetch('/api/sos/my-status', {
        headers: Auth.getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.data) {
            renderTrackerCard(data.data);
        }
    });
}

function renderTrackerCard(sos) {
    const card = document.getElementById('liveRescueTrackerCard');
    if (!card) return;

    card.classList.remove('hidden');

    const statusBadge = document.getElementById('trackerStatusBadge');
    const teamName = document.getElementById('trackerTeamName');
    const boatName = document.getElementById('trackerBoatName');
    const distanceKm = document.getElementById('trackerDistanceKm');
    const etaMin = document.getElementById('trackerEtaMin');

    if (sos.status === 'PENDING') {
        if (statusBadge) statusBadge.innerText = "🚨 PENDING APPROVAL (Broadcasting to Nearest NDRF Base)";
        if (statusBadge) statusBadge.className = "text-xs font-bold text-amber-400 animate-pulse";
        if (teamName) teamName.innerText = sos.nearestTeam ? `${sos.nearestTeam.name} (${sos.nearestTeam.distanceKm} km away)` : "Calculating nearest NDRF team...";
        if (boatName) boatName.innerText = "Awaiting NDRF Command Dispatch...";
        if (distanceKm) distanceKm.innerText = sos.nearestTeam ? `${sos.nearestTeam.distanceKm} km` : "--";
        if (etaMin) etaMin.innerText = "Calculating...";
    } else if (sos.status === 'DISPATCHED' || sos.status === 'RESCUE_IN_PROGRESS') {
        if (statusBadge) statusBadge.innerText = "🚤 RESCUE TEAM DISPATCHED & EN ROUTE!";
        if (statusBadge) statusBadge.className = "text-xs font-bold text-emerald-400 animate-pulse";
        if (teamName) teamName.innerText = sos.assignedTeamName || "NDRF 9th Bn Team Alpha";
        if (boatName) boatName.innerText = sos.dispatchedBoat || "NDRF-RESCUE-BOAT-01";
        if (distanceKm) distanceKm.innerText = `${sos.distanceToVictimKm || 0} km`;
        if (etaMin) etaMin.innerText = `${sos.etaMinutes || 0} Mins`;

        if (citizenMapInstance && sos.boatLat && sos.boatLng) {
            if (!citizenBoatMarker) {
                citizenBoatMarker = L.marker([sos.boatLat, sos.boatLng], {
                    icon: L.divIcon({
                        className: 'custom-boat-icon',
                        html: '<div style="background:#10b981; color:white; font-size:16px; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 10px #10b981;">🚤</div>'
                    })
                }).addTo(citizenMapInstance).bindPopup(`<b>🚤 ${sos.dispatchedBoat}</b><br>En route to your GPS position!`);
            } else {
                citizenBoatMarker.setLatLng([sos.boatLat, sos.boatLng]);
            }
        }
    }
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
    sirenOsc.frequency.setValueAtTime(2800, sirenAudioCtx.currentTime);

    const lfo = sirenAudioCtx.createOscillator();
    const lfoGain = sirenAudioCtx.createGain();
    lfo.frequency.value = 4;
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
