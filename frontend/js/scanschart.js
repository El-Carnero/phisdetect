/**
 * scanschart.js — Total Scans line chart (current year, Jan–Dec)
 * PhisDetect — Terminal Dashboard
 *
 * One point per calendar month (Jan…Dec). The y-scale is padded below zero
 * so the line never sits on the x-axis: it can dip, but not touch the floor.
 *
 * Logged-in users get authoritative monthly counts from the backend
 * (/api/user/scans/timeline); guests bucket their local activity log.
 */

const ScansChart = {
    chart: null,
    loading: false,
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    counts: [],

    init() {
        this.load().then(() => this.render());
        this.bindThemeToggle();
        window.addEventListener('resize', () => {
            if (this.chart) this.chart.resize();
        });
    },

    /**
     * Fetch monthly counts for the current calendar year.
     */
    async load() {
        if (this.loading) return;
        this.loading = true;
        try {
            const loggedIn = typeof AuthManager !== 'undefined'
                && AuthManager.isLoggedIn
                && AuthManager.token;
            if (loggedIn) {
                const data = await AuthManager.request('/api/user/scans/timeline?range=year');
                this.counts = this.calendarYearCountsFromBackend(data.counts || []);
            } else {
                this.counts = this.fromActivityLog();
            }
        } catch (err) {
            console.warn('Scans chart fetch failed:', err);
            this.counts = this.fromActivityLog();
        } finally {
            this.loading = false;
        }
    },

    /**
     * Map the backend's last-12-month buckets (chronological) onto the
     * current calendar year. Buckets from the previous year are dropped,
     * future months of this year stay at zero.
     */
    calendarYearCountsFromBackend(counts) {
        const now = new Date();
        const year = now.getFullYear();
        const base = year * 12 + now.getMonth();
        const out = Array.from({ length: 12 }, () => 0);
        (counts || []).slice(0, 12).forEach((c, i) => {
            const m = base - 12 + 1 + i;
            if (Math.floor(m / 12) === year) {
                out[m % 12] += (c || 0);
            }
        });
        return out;
    },

    /**
     * Bucket the local activity log (guest mode / fallback).
     */
    fromActivityLog() {
        const log = (typeof DashboardManager !== 'undefined' && DashboardManager.state)
            ? DashboardManager.state.activityLog || []
            : [];
        const now = new Date();
        const year = now.getFullYear();
        const counts = Array.from({ length: 12 }, () => 0);
        log.forEach(a => {
            if (!this.isScanType(a.type)) return;
            const t = new Date(a.date);
            if (isNaN(t) || t.getFullYear() !== year) return;
            counts[t.getMonth()] += 1;
        });
        return counts;
    },

    isScanType(type) {
        return type === 'scan' || type === 'threat';
    },

    /**
     * Draw the line chart.
     */
    render() {
        const el = document.getElementById('scansChart');
        const emptyEl = document.getElementById('scansChartEmpty');
        if (!el) return;

        const total = (this.counts || []).reduce((s, c) => s + (c || 0), 0);
        if (!total) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            el.style.display = 'none';
            if (this.chart) {
                this.chart.dispose();
                this.chart = null;
            }
            return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        el.style.display = '';
        if (el.clientWidth === 0) return;

        if (!this.chart) {
            el.innerHTML = '';
            this.chart = echarts.init(el, null, { renderer: 'svg' });
        }
        this.chart.setOption(this.buildOption(), true);
    },

    buildOption() {
        const light = (document.documentElement.getAttribute('data-theme') === 'light');
        const text = light ? '#1a1a2e' : '#e6edf3';
        const axisLine = light ? 'rgba(0,0,0,0.2)' : 'rgba(0,255,65,0.25)';
        const split = light ? 'rgba(0,0,0,0.08)' : 'rgba(0,255,65,0.08)';
        const tooltipBg = light ? 'rgba(255,255,255,0.97)' : 'rgba(10,14,20,0.96)';
        const barColor = light ? '#00b830' : '#00ff41';
        const barHighlight = light ? '#ff4a4a' : '#ff3b3b';

        const counts = this.counts || [];

        return {
            backgroundColor: 'transparent',
            grid: {
                left: 8,
                right: 8,
                top: 24,
                bottom: 12,
                containLabel: true
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: tooltipBg,
                borderColor: 'rgba(0,255,65,0.4)',
                borderWidth: 1,
                textStyle: { color: text, fontFamily: 'Inter, sans-serif', fontSize: 13 },
                formatter: (params) => {
                    const p = params[0] || {};
                    return `${p.axisValue} <b>${(p.value || 0).toLocaleString()}</b> scans`;
                }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 50,
                interval: 5,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: text,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace'
                },
                splitLine: { lineStyle: { color: split } }
            },
            xAxis: {
                type: 'category',
                data: this.labels,
                axisLine: { lineStyle: { color: axisLine } },
                axisTick: { show: false },
                axisLabel: {
                    color: text,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    interval: 0,
                    rotate: 0
                }
            },
            series: [{
                type: 'line',
                data: counts,
                smooth: false,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: barColor, width: 2 },
                itemStyle: { color: barColor },
                emphasis: {
                    itemStyle: { color: barHighlight, borderColor: barHighlight }
                },
                label: { show: false },
                z: 3
            }]
        };
    },

    bindThemeToggle() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            setTimeout(() => {
                if (this.chart) this.chart.setOption(this.buildOption(), true);
            }, 250);
        });
    }
};

window.ScansChart = ScansChart;