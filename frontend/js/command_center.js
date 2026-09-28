/**
 * NDRF Tactical Command Center GIS Map & Dispatch Controller
 * EXCLUSIVELY FOR AUTHORIZED NDRF OFFICERS & RESCUE TEAMS
 */

let mapInstance = null;
let incidentMarkers = [];
let battalionMarkers = [];
let sosList = [];
let teamsList = [];

document.addEventListener('DOMContentLoaded', () => {
    enforceOfficerAuthGuard();
});

function enforceOfficerAuthGuard() {
    const user = Auth.getUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'COMMANDER')) {
        alert("🔒 RESTRICTED ACCESS:\nOnly Authorized NDRF Officers & Rescue Commanders can access the Command Center Dashboard.\n\nPlease log in with NDRF Official Credentials.");
        window.location.href = '/login.html';
        return;
    }

    initCommandCenter();
}

function initCommandCenter() {
    initLeafletMap();
    fetchSOSIncidents();
    fetchTeamsAvailability();
    setInterval(fetchSOSIncidents, 3000); // Polling update every 3 sec for real-time tracking
}

function initLeafletMap() {
    const mapEl = document.getElementById('commandMap');
    if (!mapEl) return;

    mapInstance = L.map('commandMap').setView([23.5937, 80.9629], 5); // Centered over India Nationwide Sector

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; NDRF GIS Command Center | OpenStreetMap',
        maxZoom: 18
    }).addTo(mapInstance);
}

function fetchSOSIncidents() {
    fetch('/api/sos', {
        headers: Auth.getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            sosList = data.data;
            renderIncidentsQueue();
            renderMapMarkers();
            updateCommandMetrics();
        }
    })
    .catch(err => console.warn("Failed to fetch SOS list from server:", err));
}

function fetchTeamsAvailability() {
    fetch('/api/teams', {
        headers: Auth.getAuthHeaders()
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            teamsList = data.data;
            renderTeamsList();
            renderBattalionBaseMarkers();
        }
    })
    .catch(err => console.warn("Failed to fetch teams list:", err));
}

function renderBattalionBaseMarkers() {
    if (!mapInstance || !teamsList.length) return;

    battalionMarkers.forEach(m => mapInstance.removeLayer(m));
    battalionMarkers = [];

    teamsList.forEach(team => {
        if (team.lat && team.lng) {
            const icon = L.divIcon({
                className: 'custom-bn-icon',
                html: `<div style="background:#0284c7; color:white; font-size:11px; font-weight:bold; padding:3px 6px; border-radius:8px; border:2px solid white; box-shadow:0 0 8px rgba(0,0,0,0.5); white-space:nowrap;">🛡️ ${team.battalion}</div>`
            });

            const marker = L.marker([team.lat, team.lng], { icon })
                .addTo(mapInstance)
                .bindPopup(`
                    <div class="text-xs p-1">
                        <strong class="text-sky-400 font-bold block mb-1">🛡️ ${team.name}</strong>
                        <div>State: ${team.state}</div>
                        <div>Status: <span class="font-bold text-emerald-400">${team.status}</span></div>
                        <div>Boats Ready: ${team.boats} | Medics: ${team.medics}</div>
                        <div>Control Room: ${team.phone}</div>
                    </div>
                `);

            battalionMarkers.push(marker);
        }
    });
}

function renderMapMarkers() {
    if (!mapInstance) return;

    incidentMarkers.forEach(m => mapInstance.removeLayer(m));
    incidentMarkers = [];

    sosList.forEach(sos => {
        const isCritical = sos.condition === 'MEDICAL_CRITICAL' || sos.condition === 'FLOOD_TRAPPED';
        const color = sos.status === 'DISPATCHED' ? '#10b981' : (isCritical ? '#ef4444' : '#f59e0b');

        // Incident Marker
        const circleMarker = L.circleMarker([sos.lat, sos.lng], {
            radius: 11,
            fillColor: color,
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.95
        }).addTo(mapInstance);

        const victimName = sos.citizenName || 'Victim';
        const victimPhone = sos.citizenPhone ? `📞 ${sos.citizenPhone}` : 'N/A';
        const nearestInfo = sos.nearestTeam ? `<div class="text-sky-300 font-bold mt-1">📍 Nearest Base: ${sos.nearestTeam.name} (${sos.nearestTeam.distanceKm} km away)</div>` : '';

        circleMarker.bindPopup(`
            <div class="text-xs p-1 space-y-1">
                <strong class="text-sky-400 font-bold block mb-1">🚨 ${sos.condition}</strong>
                <div class="font-bold text-white">Victim: ${victimName}</div>
                <div class="text-emerald-400 font-mono">${victimPhone}</div>
                ${nearestInfo}
                <div>Location: ${sos.lat}, ${sos.lng} (Floor: ${sos.floor || 0})</div>
                <div>Status: <span class="font-bold text-amber-400">${sos.status}</span></div>
                <button onclick="dispatchBoat('${sos.id}', '${sos.nearestTeam ? sos.nearestTeam.id : ''}')" class="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2 rounded text-[10px]">
                    🚤 Dispatch Nearest Rescue Team
                </button>
            </div>
        `);

        incidentMarkers.push(circleMarker);

        // Render live dispatched boat marker if en route
        if (sos.status === 'DISPATCHED' && sos.boatLat && sos.boatLng) {
            const boatMarker = L.marker([sos.boatLat, sos.boatLng], {
                icon: L.divIcon({
                    className: 'custom-boat-icon',
                    html: '<div style="background:#10b981; color:white; font-size:16px; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 10px #10b981;">🚤</div>'
                })
            }).addTo(mapInstance).bindPopup(`<b>🚤 ${sos.dispatchedBoat}</b><br>ETA: ${sos.etaMinutes} Mins (${sos.distanceToVictimKm} km remaining)`);

            incidentMarkers.push(boatMarker);

            // Draw route line from boat to victim
            const routeLine = L.polyline([[sos.boatLat, sos.boatLng], [sos.lat, sos.lng]], {
                color: '#10b981',
                weight: 3,
                dashArray: '5, 10'
            }).addTo(mapInstance);
            incidentMarkers.push(routeLine);
        }
    });
}

function renderIncidentsQueue() {
    const container = document.getElementById('incidentList');
    if (!container) return;

    if (sosList.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 text-center py-8">No active SOS packets in queue.</p>';
        return;
    }

    container.innerHTML = sosList.map(sos => `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-1.5 text-xs">
            <div class="flex justify-between items-center">
                <span class="font-bold ${sos.condition === 'MEDICAL_CRITICAL' ? 'text-red-400' : 'text-amber-400'}">${sos.condition}</span>
                <span class="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">${sos.source || 'BLE_MESH'}</span>
            </div>
            
            <div class="flex justify-between items-center text-slate-200">
                <span class="font-bold">👤 ${sos.citizenName || 'Citizen'}</span>
                <span class="font-mono text-sky-400 text-[11px]">📞 ${sos.citizenPhone || 'N/A'}</span>
            </div>

            ${sos.emergencyContact ? `
                <div class="text-[10px] text-slate-400">Emergency Contact: <span class="text-slate-200 font-mono">${sos.emergencyContact}</span> | Blood Group: <span class="text-amber-400 font-bold">${sos.bloodGroup || 'N/A'}</span></div>
            ` : ''}

            ${sos.medicalNotes ? `
                <div class="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 p-1 rounded">🩺 ${sos.medicalNotes}</div>
            ` : ''}

            ${sos.nearestTeam ? `
                <div class="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/50 p-1 rounded flex justify-between">
                    <span>📍 Nearest Base: ${sos.nearestTeam.name}</span>
                    <span>${sos.nearestTeam.distanceKm} km away</span>
                </div>
            ` : ''}

            <div class="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>📍 GPS: ${sos.lat}, ${sos.lng} (Floor ${sos.floor || 0})</span>
                <span>${new Date(sos.timestamp).toLocaleTimeString()}</span>
            </div>

            <div class="pt-1">
                ${sos.status === 'DISPATCHED' || sos.status === 'RESCUE_IN_PROGRESS' ? `
                    <div class="bg-emerald-950 border border-emerald-800 p-2 rounded text-center text-[10px] font-bold text-emerald-400 space-y-0.5">
                        <div>🚤 Boat: ${sos.dispatchedBoat}</div>
                        <div>ETA: ${sos.etaMinutes || 0} Mins (${sos.distanceToVictimKm || 0} km away)</div>
                    </div>
                ` : `
                    <button onclick="dispatchBoat('${sos.id}', '${sos.nearestTeam ? sos.nearestTeam.id : ''}')" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded text-xs shadow">
                        Approve & Dispatch Nearest Team 🚤
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function dispatchBoat(sosId, nearestTeamId) {
    const boatName = prompt("Confirm Rescue Boat Code / Unit Name:", "NDRF-RESCUE-BOAT-" + Math.floor(Math.random() * 20 + 1));
    if (!boatName) return;

    fetch('/api/sos/dispatch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...Auth.getAuthHeaders()
        },
        body: JSON.stringify({ sosId, boatName, assignedTeamId: nearestTeamId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(`🚤 Rescue Boat ${boatName} successfully approved & dispatched!`);
            fetchSOSIncidents();
        }
    });
}

function renderTeamsList() {
    const el = document.getElementById('teamAvailabilityList');
    if (!el) return;

    el.innerHTML = teamsList.map(t => `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs">
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-white">${t.name}</span>
                <span class="text-[10px] ${t.status === 'READY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'} px-2 py-0.5 rounded font-bold">${t.status}</span>
            </div>
            <div class="text-slate-400 text-[11px]">Battalion: ${t.battalion} (${t.state})</div>
            <div class="flex justify-between mt-2 text-[10px] text-slate-300 border-t border-slate-800 pt-1">
                <span>🚤 Inflatable Boats: ${t.boats}</span>
                <span>🩺 Paramedics: ${t.medics}</span>
            </div>
        </div>
    `).join('');
}

function updateCommandMetrics() {
    const statTotal = document.getElementById('statTotalSOS');
    const statCritical = document.getElementById('statCritical');
    const statDispatched = document.getElementById('statDispatched');

    if (statTotal) statTotal.innerText = sosList.length;
    if (statCritical) statCritical.innerText = sosList.filter(s => s.condition === 'MEDICAL_CRITICAL').length;
    if (statDispatched) statDispatched.innerText = sosList.filter(s => s.status === 'DISPATCHED' || s.status === 'RESCUE_IN_PROGRESS').length;
}

function simulateIncomingMesh() {
    const randomLat = 25.5 + (Math.random() * 0.2);
    const randomLng = 85.1 + (Math.random() * 0.2);
    
    fetch('/api/sos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...Auth.getAuthHeaders()
        },
        body: JSON.stringify({
            lat: Number(randomLat.toFixed(4)),
            lng: Number(randomLng.toFixed(4)),
            condition: Math.random() > 0.5 ? 'FLOOD_TRAPPED' : 'MEDICAL_CRITICAL',
            landmark: 'Near River Barrage',
            floor: Math.floor(Math.random() * 3),
            source: 'BLE_P2P_MESH'
        })
    }).then(() => fetchSOSIncidents());
}
