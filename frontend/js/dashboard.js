/**
 * dashboard.js — Dashboard Statistics Manager
 * PhisDetect — Terminal Dashboard
 */

const DashboardManager = {
    /**
     * Dashboard state
     */
    state: {
        totalScans: 0,
        threatsDetected: 0,
        reportsSubmitted: 0,
        pointsEarned: 0,
        activityLog: [],
        trend: null
    },

    /**
     * Initialize dashboard
     */
    init() {
        this.loadState();
        this.renderStats();
        this.renderActivityLog();
        this.setupRefreshButton();
        this.loadFromServer();
    },

    /**
     * Load the authoritative stats from the backend when the user is logged in.
     */
    async loadFromServer() {
        if (typeof AuthManager === 'undefined' || !AuthManager.isLoggedIn) return;
        const stats = await AuthManager.stats();
        if (!stats) return;

        this.state.totalScans = stats.totalScans || 0;
        this.state.threatsDetected = stats.threatsDetected || 0;
        this.state.reportsSubmitted = stats.reportsSubmitted || 0;
        this.state.pointsEarned = stats.pointsEarned || 0;
        if (Array.isArray(stats.activity) && stats.activity.length) {
            this.state.activityLog = stats.activity.map(a => ({
                type: a.type,
                message: a.message,
                timestamp: '',
                date: a.date || ''
            }));
        }
        this.state.trend = (stats.trend && Array.isArray(stats.trend)) ? stats.trend : null;

        this.saveState();
        this.renderStats();
        this.renderActivityLog();
    },

    /**
     * Load state from localStorage
     */
    loadState() {
        const saved = localStorage.getItem('phisdetect-dashboard');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            } catch (e) {
                console.warn('Failed to load dashboard state:', e);
            }
        }
    },

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('phisdetect-dashboard', JSON.stringify(this.state));
        } catch (e) {
            console.warn('Failed to save dashboard state:', e);
        }
    },

    /**
     * Animate a stat number toward its target value
     */
    animateValue(el, target) {
        if (!el) return;
        const current = parseInt(el.dataset.value || '0', 10);
        if (current === target) return;
        el.dataset.value = target;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const delta = Math.abs(target - current);

        if (reduceMotion || delta === 1) {
            el.textContent = target;
            return;
        }

        const duration = 600;
        const start = performance.now();
        const step = now => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(current + (target - current) * eased);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    /**
     * Render statistics cards (+ sparklines and delta badges)
     */
    renderStats() {
        const elements = {
            totalScans: document.getElementById('totalScans'),
            threatsDetected: document.getElementById('threatsDetected'),
            reportsSubmitted: document.getElementById('reportsSubmitted'),
            pointsEarned: document.getElementById('pointsEarned')
        };

        this.animateValue(elements.totalScans, this.state.totalScans);
        this.animateValue(elements.threatsDetected, this.state.threatsDetected);
        this.animateValue(elements.reportsSubmitted, this.state.reportsSubmitted);
        this.animateValue(elements.pointsEarned, this.state.pointsEarned);

        this.renderSparklines();
    },

    /**
     * 7-day series per metric for the sparklines.
     * Logged-in users get authoritative data from the backend trend;
     * guests build the series from their local activity log.
     */
    trendSeries() {
        if (Array.isArray(this.state.trend) && this.state.trend.length >= 7) {
            return this.seriesFromBackendTrend();
        }
        return this.seriesFromActivityLog();
    },

    seriesFromBackendTrend() {
        const t = this.state.trend;
        const series = { scans: [], threats: [], reports: [], points: [] };
        t.forEach(d => {
            const v = d.value || {};
            series.scans.push(v.scans || 0);
            series.threats.push(v.threats || 0);
            series.reports.push(v.reports || 0);
            series.points.push(v.points || 0);
        });
        return series;
    },

    seriesFromActivityLog() {
        const days = 14;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
        const buckets = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            buckets.push({ date: d.toDateString(), scans: 0, threats: 0, reports: 0, points: 0 });
        }
        this.state.activityLog.forEach(a => {
            const day = new Date(a.date).toDateString();
            const bucket = buckets.find(b => b.date === day);
            if (!bucket) return;
            if (a.type === 'threat') bucket.threats += 1;
            else if (a.type === 'report') bucket.reports += 1;
            else if (a.type === 'points') bucket.points += 1;
            else if (a.type === 'scan') bucket.scans += 1;
            else if (a.type === 'system') { /* ignored */ }
        });
        return {
            scans: buckets.map(b => b.scans),
            threats: buckets.map(b => b.threats),
            reports: buckets.map(b => b.reports),
            points: buckets.map(b => b.points)
        };
    },

    /**
     * Draw tiny SVG sparklines + a +/- delta badge on the four stat cards.
     */
    renderSparklines() {
        const series = this.trendSeries();
        const config = {
            scans:   { key: 'scans',   path: 'sparkScans',   delta: 'deltaScans',   color: '#00ff41', invert: false },
            threats: { key: 'threats', path: 'sparkThreats', delta: 'deltaThreats', color: '#ff3b3b', invert: true  },
            reports: { key: 'reports', path: 'sparkReports', delta: 'deltaReports', color: '#f59e0b', invert: false },
            points:  { key: 'points',  path: 'sparkPoints',  delta: 'deltaPoints',  color: '#f59e0b', invert: false }
        };
        Object.values(config).forEach(c => this.renderSeries(c, series[c.key]));
    },

    renderSeries(cfg, data) {
        const svg = document.getElementById(cfg.path);
        const deltaEl = document.getElementById(cfg.delta);
        if (!svg) return;

        const full = Array.isArray(data) ? data : [];
        // Sparkline shows the most recent 7 days; delta compares them to the 7 before.
        const values = full.slice(-7);
        const older = full.slice(-14, -7);
        const len = values.length;
        const light = (document.documentElement.getAttribute('data-theme') === 'light');
        const color = light ? { scans: '#00b830', threats: '#ff4a4a', reports: '#d98a1f', points: '#d98a1f' }[cfg.key] : cfg.color;

        const W = 100, H = 52;
        const PADX = 3;
        const innerW = W - PADX * 2;
        const max = Math.max(1, ...values);
        const stepX = len <= 1 ? 0 : innerW / (len - 1);
        const pts = values.map((v, i) => {
            const x = len <= 1 ? W / 2 : PADX + i * stepX;
            const y = H - 2 - (v / max) * (H - 5);
            return [x, y];
        });

        if (len <= 1) {
            svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
            svg.innerHTML = `<line x1="2" y1="${H-3}" x2="${W-2}" y2="${H-3}" stroke="${color}" stroke-width="1" opacity="0.5" stroke-dasharray="3 2" />`;
        } else {
            const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
            const areaPath = `${linePath} L${pts[pts.length-1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
            const last = pts[pts.length - 1];
            svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
            svg.innerHTML = `
                <defs>
                    <linearGradient id="grad${cfg.path}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="0.40" />
                        <stop offset="100%" stop-color="${color}" stop-opacity="0.02" />
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#grad${cfg.path})" stroke="none" />
                <path d="${linePath}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="1.8" fill="${color}" />
            `;
        }

        // Delta badge: last 7 days vs the 7 before
        const current = values.reduce((s, v) => s + v, 0);
        const prev = older.reduce((s, v) => s + v, 0);
        if (!deltaEl) return;
        if (current === 0 && prev === 0) {
            deltaEl.textContent = '';
            deltaEl.className = 'delta-badge';
            return;
        }
        let pct;
        if (prev === 0) pct = current === 0 ? 0 : 100;
        else pct = ((current - prev) / prev) * 100;
        const up = pct >= 0;
        // "invert" colors when the metric being high is bad (threats)
        const good = cfg.invert ? !up : up;
        pct = Math.abs(pct);
        const label = pct >= 100 ? `${Math.round(pct)}%` : `${pct.toFixed(0)}%`;
        deltaEl.textContent = `${up ? '▲' : '▼'} ${label}`;
        deltaEl.className = `delta-badge ${good ? 'good' : 'bad'}`;
        deltaEl.title = `Last 7 days vs the 7 days before`;
    },

    /**
     * Render activity log
     */
    renderActivityLog() {
        const logContainer = document.getElementById('activityLog');
        if (!logContainer) return;

        if (this.state.activityLog.length === 0) {
            logContainer.innerHTML = `
                <div class="log-line">
                    <span class="log-activity-icon log-gray"><i class="fa-solid fa-terminal"></i></span>
                    <span class="log-message log-gray">System ready. Waiting for activity...</span>
                    <span class="log-time">--:--:--</span>
                </div>
            `;
            return;
        }

        // Get last 10 activities (most recent first)
        const recent = this.state.activityLog.slice(-10).reverse();

        logContainer.innerHTML = recent.map(entry => {
            const time = entry.timestamp
                || (entry.date ? new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--');
            const icon = this.getActivityIcon(entry.type);
            const colorClass = this.getActivityColor(entry.type);
            const message = this.escapeHtml(entry.message || '');

            return `
                <div class="log-line">
                    <span class="log-activity-icon ${colorClass}">
                        <i class="fa-solid fa-${icon}"></i>
                    </span>
                    <span class="log-message">${message}</span>
                    <span class="log-time">${time}</span>
                </div>
            `;
        }).join('');
    },

    escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]));
    },

    /**
     * Get icon (Font Awesome name) for activity type
     */
    getActivityIcon(type) {
        const icons = {
            scan: 'magnifying-glass',
            threat: 'triangle-exclamation',
            report: 'flag',
            points: 'star',
            system: 'terminal'
        };
        return icons[type] || 'circle';
    },

    /**
     * Get color class for activity type
     */
    getActivityColor(type) {
        const colors = {
            scan: 'log-green',
            threat: 'log-red',
            report: 'log-amber',
            points: 'log-green',
            system: 'log-gray'
        };
        return colors[type] || 'log-gray';
    },

    /**
     * Add activity to log
     */
    addActivity(type, message) {
        const now = new Date();
        const timestamp = now.toTimeString().slice(0, 8);
        
        this.state.activityLog.push({
            type,
            message,
            timestamp,
            date: now.toISOString()
        });

        // Keep log manageable (max 100 entries)
        if (this.state.activityLog.length > 100) {
            this.state.activityLog = this.state.activityLog.slice(-100);
        }

        this.saveState();
        this.renderActivityLog();
    },

    /**
     * Update statistics
     */
    updateStats(data) {
        if (data.totalScans !== undefined) {
            this.state.totalScans = data.totalScans;
        }
        if (data.threatsDetected !== undefined) {
            this.state.threatsDetected = data.threatsDetected;
        }
        if (data.reportsSubmitted !== undefined) {
            this.state.reportsSubmitted = data.reportsSubmitted;
        }
        if (data.pointsEarned !== undefined) {
            this.state.pointsEarned = data.pointsEarned;
        }

        this.saveState();
        this.renderStats();
    },

    /**
     * Increment scans counter
     */
    incrementScans(count = 1, detail = '') {
        this.state.totalScans += count;
        this.saveState();
        this.renderStats();
        this.addActivity('scan', detail || `Scan completed (${count})`);
    },

    /**
     * Increment threats counter
     */
    incrementThreats(count = 1, detail = '') {
        this.state.threatsDetected += count;
        this.saveState();
        this.renderStats();
        this.addActivity('threat', detail || `Threat detected (${count})`);
    },

    /**
     * Increment reports counter
     */
    incrementReports(count = 1, detail = '') {
        this.state.reportsSubmitted += count;
        this.saveState();
        this.renderStats();
        this.addActivity('report', detail || `Report submitted (${count})`);
    },

    /**
     * Increment points counter
     */
    incrementPoints(count = 1, detail = '') {
        this.state.pointsEarned += count;
        this.saveState();
        this.renderStats();
        this.addActivity('points', detail || `+${count} points earned`);
    },

    /**
     * Setup refresh button
     */
    setupRefreshButton() {
        const refreshBtn = document.querySelector('button[onclick*="location.reload()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refresh();
            });
        }

        // Also check for any button with refresh icon
        document.querySelectorAll('.btn .fa-rotate').forEach(icon => {
            const btn = icon.closest('.btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.refresh();
                });
            }
        });
    },

    /**
     * Refresh dashboard data
     */
    refresh() {
        // Simulate loading
        const stats = document.querySelectorAll('.card .stat-value');
        stats.forEach(el => {
            el.textContent = '...';
        });

        setTimeout(() => {
            // Logged-in users get authoritative numbers from the database;
            // guests reload their local state.
            if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn) {
                this.loadFromServer();
            } else {
                this.loadState();
                this.renderStats();
                this.renderActivityLog();
            }
            this.addActivity('system', 'Dashboard refreshed');
            
            // Visual feedback
            const refreshBtn = document.querySelector('.btn .fa-rotate')?.closest('.btn');
            if (refreshBtn) {
                refreshBtn.style.opacity = '0.6';
                setTimeout(() => {
                    refreshBtn.style.opacity = '1';
                }, 300);
            }
        }, 500);
    },

    /**
     * Reset all stats (for testing)
     */
    reset() {
        Utils.confirmDialog('Reset all dashboard statistics?', {
            title: 'Reset Statistics',
            confirmText: 'Reset'
        }).then(confirmed => {
            if (!confirmed) return;

            this.state = {
                totalScans: 0,
                threatsDetected: 0,
                reportsSubmitted: 0,
                pointsEarned: 0,
                activityLog: []
            };
            this.saveState();
            this.renderStats();
            this.renderActivityLog();
            this.addActivity('system', 'Statistics reset');
            Utils.toast('Dashboard statistics reset.', 'info');
        });
    }
};

// Export for use in other modules
window.DashboardManager = DashboardManager;