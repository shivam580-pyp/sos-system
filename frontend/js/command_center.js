/**
 * NDRF Tactical Command Center GIS Map & Dispatch Controller with Auth & PII View
 */

let mapInstance = null;
let incidentMarkers = [];
let sosList = [];
let teamsList = [];

document.addEventListener('DOMContentLoaded', () => {
    initCommandCenter();
});

function initCommandCenter() {
    initLeafletMap();
    fetchSOSIncidents();
    fetchTeamsAvailability();
    setInterval(fetchSOSIncidents, 5000); // Polling update every 5 sec
}

function initLeafletMap() {
    const mapEl = document.getElementById('commandMap');
    if (!mapEl) return;

    mapInstance = L.map('commandMap').setView([25.5941, 85.1376], 6);

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
        }
    })
    .catch(err => console.warn("Failed to fetch teams list:", err));
}

function renderMapMarkers() {
    if (!mapInstance) return;

    incidentMarkers.forEach(m => mapInstance.removeLayer(m));
    incidentMarkers = [];

    sosList.forEach(sos => {
        const isCritical = sos.condition === 'MEDICAL_CRITICAL' || sos.condition === 'FLOOD_TRAPPED';
        const color = sos.status === 'DISPATCHED' ? '#10b981' : (isCritical ? '#ef4444' : '#f59e0b');

        const circleMarker = L.circleMarker([sos.lat, sos.lng], {
            radius: 10,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(mapInstance);

        const victimName = sos.citizenName || 'Victim';
        const victimPhone = sos.citizenPhone ? `📞 ${sos.citizenPhone}` : '🔒 Contact Hidden (Log in as Admin)';
        const medical = sos.medicalNotes ? `🩺 Medical: ${sos.medicalNotes}` : '';

        circleMarker.bindPopup(`
            <div class="text-xs p-1 space-y-1">
                <strong class="text-sky-400 font-bold block mb-1">🚨 ${sos.condition}</strong>
                <div class="font-bold text-white">Victim: ${victimName}</div>
                <div class="text-emerald-400 font-mono">${victimPhone}</div>
                ${medical ? `<div class="text-amber-300 text-[10px]">${medical}</div>` : ''}
                <div>Location: ${sos.lat}, ${sos.lng} (Floor: ${sos.floor || 0})</div>
                <div>Status: <span class="font-bold">${sos.status}</span></div>
                <button onclick="dispatchBoat('${sos.id}')" class="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2 rounded text-[10px]">
                    🚤 Dispatch Rescue Boat
                </button>
            </div>
        `);

        incidentMarkers.push(circleMarker);
    });
}

function renderIncidentsQueue() {
    const container = document.getElementById('incidentList');
    if (!container) return;

    if (sosList.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 text-center py-8">No active SOS packets in queue.</p>';
        return;
    }

    const currentUser = Auth.getUser();
    const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'COMMANDER');

    container.innerHTML = sosList.map(sos => `
        <div class="bg-slate-900 p-3 rounded-lg border border-slate-700 space-y-1 text-xs">
            <div class="flex justify-between items-center">
                <span class="font-bold ${sos.condition === 'MEDICAL_CRITICAL' ? 'text-red-400' : 'text-amber-400'}">${sos.condition}</span>
                <span class="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">${sos.source || 'BLE_MESH'}</span>
            </div>
            
            <div class="flex justify-between items-center text-slate-200">
                <span class="font-bold">👤 ${sos.citizenName || 'Citizen'}</span>
                <span class="font-mono text-sky-400 text-[11px]">${sos.citizenPhone ? '📞 ' + sos.citizenPhone : '🔒 Private'}</span>
            </div>

            ${isAdmin && sos.emergencyContact ? `
                <div class="text-[10px] text-slate-400">Emergency Contact: <span class="text-slate-200 font-mono">${sos.emergencyContact}</span> | Blood Group: <span class="text-amber-400 font-bold">${sos.bloodGroup || 'N/A'}</span></div>
            ` : ''}

            ${isAdmin && sos.medicalNotes ? `
                <div class="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 p-1 rounded">🩺 ${sos.medicalNotes}</div>
            ` : ''}

            <div class="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>📍 ${sos.lat}, ${sos.lng} (Floor ${sos.floor || 0})</span>
                <span>${new Date(sos.timestamp).toLocaleTimeString()}</span>
            </div>

            <div class="pt-1">
                ${sos.status === 'DISPATCHED' ? `
                    <span class="block text-center bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded text-[10px] font-bold">
                        Boat Dispatched: ${sos.dispatchedBoat || 'NDRF-BOAT-01'}
                    </span>
                ` : `
                    <button onclick="dispatchBoat('${sos.id}')" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1 rounded text-xs shadow">
                        Dispatch Rescue Boat 🚤
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function dispatchBoat(sosId) {
    const currentUser = Auth.getUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
        if (!confirm("🔒 Note: Only Authorized NDRF Command Officers can dispatch rescue boats. Continue as Demo Officer?")) {
            return;
        }
    }

    const boatName = prompt("Enter Rescue Boat Code / Team Name:", "NDRF-BOAT-" + Math.floor(Math.random() * 20 + 1));
    if (!boatName) return;

    fetch('/api/sos/dispatch', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...Auth.getAuthHeaders()
        },
        body: JSON.stringify({ sosId, boatName })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(`🚤 Rescue Boat ${boatName} successfully dispatched!`);
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
            <div class="text-slate-400 text-[11px]">Battalion: ${t.battalion}</div>
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
    if (statDispatched) statDispatched.innerText = sosList.filter(s => s.status === 'DISPATCHED').length;
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
