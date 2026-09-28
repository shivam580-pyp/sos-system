/**
 * NDRF Authentication & User Session Manager
 */
const Auth = {
    getToken() {
        return localStorage.getItem('ndrf_auth_token');
    },

    setToken(token) {
        localStorage.setItem('ndrf_auth_token', token);
    },

    getUser() {
        const u = localStorage.getItem('ndrf_user');
        return u ? JSON.parse(u) : null;
    },

    setUser(user) {
        localStorage.setItem('ndrf_user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('ndrf_auth_token');
        localStorage.removeItem('ndrf_user');
        window.location.href = '/login.html';
    },

    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    async checkSession() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const res = await fetch('/api/auth/me', {
                headers: this.getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                this.setUser(data.user);
                return data.user;
            } else {
                this.logout();
                return null;
            }
        } catch (e) {
            return this.getUser();
        }
    },

    renderUserBadge(containerId = 'userAuthBadge') {
        const el = document.getElementById(containerId);
        if (!el) return;

        const user = this.getUser();
        if (user) {
            const roleBadgeClass = user.role === 'ADMIN' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
            el.innerHTML = `
                <div class="flex items-center space-x-2 text-xs">
                    <span class="px-2 py-0.5 rounded font-bold ${roleBadgeClass}">${user.role}</span>
                    <span class="font-bold text-slate-200">${user.name}</span>
                    <button onclick="Auth.logout()" class="text-[10px] text-red-400 hover:underline border border-red-800/50 bg-red-950/40 px-2 py-0.5 rounded">
                        Logout 🚪
                    </button>
                </div>
            `;
        } else {
            el.innerHTML = `
                <a href="/login.html" class="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-sky-500">
                    🔑 Login / Register
                </a>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.checkSession().then(() => {
        Auth.renderUserBadge();
    });
});
