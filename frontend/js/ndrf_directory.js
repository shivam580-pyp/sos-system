/**
 * NDRF 16-Battalions National Directory & Helpline Dataset
 */
const ndrfDirectory = [
    { bn: "HQ Control Room", location: "New Delhi", phone: "011-24363260", altPhone: "9711077372", coverage: "National Control Room" },
    { bn: "1st Battalion", location: "Guwahati, Assam", phone: "0361-2840138", coverage: "Assam & North-East" },
    { bn: "2nd Battalion", location: "Haringhata, West Bengal", phone: "033-25875032", coverage: "West Bengal & Sikkim" },
    { bn: "3rd Battalion", location: "Mundali, Odisha", phone: "0671-2879710", coverage: "Odisha & Chhattisgarh" },
    { bn: "4th Battalion", location: "Arakkonam, Tamil Nadu", phone: "044-27926410", coverage: "Tamil Nadu, Kerala, Puducherry" },
    { bn: "5th Battalion", location: "Pune, Maharashtra", phone: "02114-247000", coverage: "Maharashtra, Goa" },
    { bn: "6th Battalion", location: "Vadodara, Gujarat", phone: "0265-2488123", coverage: "Gujarat, Daman & Diu" },
    { bn: "7th Battalion", location: "Bhatinda, Punjab", phone: "0164-2246011", coverage: "Punjab, Himachal Pradesh, J&K" },
    { bn: "8th Battalion", location: "Ghaziabad, UP", phone: "0120-2766618", coverage: "Delhi NCR, UP, Uttarakhand" },
    { bn: "9th Battalion", location: "Patna/Bihta, Bihar", phone: "06115-252101", coverage: "Bihar & Jharkhand" },
    { bn: "10th Battalion", location: "Vijayawada, AP", phone: "0863-2293111", coverage: "Andhra Pradesh & Telangana" },
    { bn: "11th Battalion", location: "Varanasi, UP", phone: "0542-2500005", coverage: "Eastern UP & MP" },
    { bn: "12th Battalion", location: "Itanagar, Arunachal Pradesh", phone: "0360-2284123", coverage: "Arunachal & Nagaland" },
    { bn: "13th Battalion", location: "Ladmora, Uttarakhand", phone: "05962-230012", coverage: "Uttarakhand Hills" },
    { bn: "14th Battalion", location: "Jersuguda, Odisha", phone: "06645-220011", coverage: "Central Mining Belt" },
    { bn: "15th Battalion", location: "Jammu, J&K", phone: "0191-2450011", coverage: "Jammu & Kashmir High Altitude" },
    { bn: "16th Battalion", location: "Bengaluru, Karnataka", phone: "080-28391111", coverage: "Karnataka & South Zone" }
];

function renderDirectory(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = ndrfDirectory.map(item => `
        <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center text-xs mb-2">
            <div>
                <span class="text-white font-bold block">${item.bn} - ${item.location}</span>
                <span class="text-slate-400 text-[10px]">${item.coverage}</span>
            </div>
            <a href="tel:${item.phone.replace(/[^0-9]/g, '')}" class="bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs px-3 py-1.5 rounded-lg border border-sky-500">
                ${item.phone} 📞
            </a>
        </div>
    `).join('');
}
