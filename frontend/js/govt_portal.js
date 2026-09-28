/**
 * Government SDMA Analytics & Report Portal Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    initGovtPortal();
});

function initGovtPortal() {
    loadGovtMetrics();
}

function loadGovtMetrics() {
    fetch('/api/govt-report')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderGovtReportUI(data.data);
            }
        })
        .catch(err => console.warn("Govt metrics load warning:", err));
}

function renderGovtReportUI(metrics) {
    const elTotal = document.getElementById('govtTotalSOS');
    const elPending = document.getElementById('govtPendingSOS');
    const elDispatched = document.getElementById('govtDispatchedSOS');
    const elCritical = document.getElementById('govtCriticalMedical');

    if (elTotal) elTotal.innerText = metrics.totalSOS;
    if (elPending) elPending.innerText = metrics.pendingSOS;
    if (elDispatched) elDispatched.innerText = metrics.dispatchedSOS;
    if (elCritical) elCritical.innerText = metrics.criticalMedical;
}

function exportReportCSV() {
    fetch('/api/sos')
        .then(res => res.json())
        .then(data => {
            if (!data.success || !data.data.length) {
                alert("No SOS records available for export.");
                return;
            }

            const headers = ["ID", "Condition", "Latitude", "Longitude", "Status", "DispatchedBoat", "Landmark", "Floor", "Timestamp", "Source"];
            const csvRows = [headers.join(',')];

            data.data.forEach(row => {
                const values = [
                    row.id,
                    `"${row.condition}"`,
                    row.lat,
                    row.lng,
                    row.status,
                    `"${row.dispatchedBoat || ''}"`,
                    `"${row.landmark || ''}"`,
                    row.floor || 0,
                    `"${new Date(row.timestamp).toISOString()}"`,
                    row.source
                ];
                csvRows.push(values.join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', `NDRF_Disaster_SOS_Report_${Date.now()}.csv`);
            a.click();
        });
}

function exportReportJSON() {
    fetch('/api/sos')
        .then(res => res.json())
        .then(data => {
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', `NDRF_Disaster_SOS_Report_${Date.now()}.json`);
            a.click();
        });
}
