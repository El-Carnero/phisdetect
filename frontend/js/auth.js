/**
 * auth.js — Account Authentication Manager
 * PhisDetect — email + password login only
 */

const AuthManager = {
    BACKEND: 'http://localhost:3000',
    TOKEN_KEY: 'phisdetect-token',

    get token() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    set token(value) {
        if (value) {
            localStorage.setItem(this.TOKEN_KEY, value);
        } else {
            localStorage.removeItem(this.TOKEN_KEY);
        }
    },

    get isLoggedIn() {
        return !!this.token;
    },

    /**
     * Fetch helper that attaches the bearer token and parses errors.
     */
    async request(path, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (this.token) headers['Authorization'] = 'Bearer ' + this.token;

        const resp = await fetch(`${this.BACKEND}${path}`, { ...options, headers });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            const err = new Error(data.error || `Request failed (${resp.status})`);
            err.status = resp.status;
            throw err;
        }
        return data;
    },

    async signup(email, password, name) {
        const data = await this.request('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        });
        this.token = data.token;
        return data.user;
    },

    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.token = data.token;
        return data.user;
    },

    async logout() {
        try {
            await this.request('/api/auth/logout', { method: 'POST', body: '{}' });
        } catch (e) {
            /* ignore network errors — clear locally regardless */
        }
        this.token = null;
    },

    /**
     * Fetch the logged-in user. Returns user object or null.
     */
    async me() {
        if (!this.token) return null;
        try {
            const data = await this.request('/api/auth/me');
            return data.user;
        } catch (e) {
            if (e.status === 401) this.token = null;
            return null;
        }
    },

    /**
     * Award points / reports to the logged-in account.
     */
    async reward(points, reports) {
        if (!this.token) return null;
        try {
            const data = await this.request('/api/auth/reward', {
                method: 'POST',
                body: JSON.stringify({ points: points || 0, reports: reports || 0 }),
            });
            return data.user;
        } catch (e) {
            return null;
        }
    },

    /**
     * Fetch the dashboard stats for the logged-in account (computed server-side).
     */
    async stats() {
        if (!this.token) return null;
        try {
            const data = await this.request('/api/user/stats');
            return data;
        } catch (e) {
            return null;
        }
    },
};

window.AuthManager = AuthManager;
