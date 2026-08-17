/**
 * threatmap.js — Phishing Threat Map (PhishStats world feed)
 * PhisDetect — Terminal Dashboard
 *
 * Renders a world choropleth in ECharts. Brighter = more recent phishing
 * activity, darker = less. Data flows through the backend at /api/threats/map
 * so the PhishStats API key is never exposed to the browser.
 */

const ThreatMap = {
    chart: null,
    worldGeo: null,
    data: null,
    loaded: false,

    init() {
        this.loadWorldGeo().then(() => this.render());
        this.bindThemeToggle();
        window.addEventListener('resize', () => {
            if (this.chart) this.chart.resize();
        });
    },

    /**
     * Fetch + decode the world GeoJSON bundled with the frontend
     * (no CDN needed, works offline).
     */
    async loadWorldGeo() {
        try {
            const resp = await fetch('js/world.json');
            if (!resp.ok) throw new Error('world.json ' + resp.status);
            this.worldGeo = await resp.json();
        } catch (err) {
            console.warn('Failed to load world GeoJSON:', err);
            this.showUnavailable('Map data could not be loaded.');
        }
    },

    /**
     * Build the ECharts option for the current theme.
     */
    buildOption() {
        const light = (document.documentElement.getAttribute('data-theme') === 'light');

        const bg = light ? '#ffffff' : '#0e141f';
        const border = light ? 'rgba(0,0,0,0.15)' : 'rgba(0,255,65,0.25)';
        const text = light ? '#1a1a2e' : '#e6edf3';
        const nameText = light ? '#5a5a6e' : '#8b949e';
        const tooltipBg = light ? 'rgba(255,255,255,0.97)' : 'rgba(10,14,20,0.96)';
        const tooltipBorder = 'rgba(0,255,65,0.4)';

        // ramp: low (dark navy) -> mid (green) -> high (bright red)
        const ramp = ['#0b1020', '#123f2c', '#00aa33', '#ffdf3d', '#ff3b3b'];
        const lightRamp = ['#d9e1ec', '#bfe8cd', '#37c96b', '#ffc93d', '#ff4a4a'];

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                textStyle: { color: text, fontFamily: 'Inter, sans-serif', fontSize: 13 },
                formatter: (p) => {
                    const name = p.name || 'Unknown';
                    const value = p.value == null ? 0 : p.value;
                    return `<b>${name}</b><br/>Recent phishing URLs: <b>${value.toLocaleString()}</b>`;
                }
            },
            visualMap: {
                min: 0,
                max: 100,
                left: 12,
                bottom: 12,
                calculable: true,
                orient: 'horizontal',
                text: ['High', 'Low'],
                textStyle: { color: nameText, fontSize: 10 },
                inRange: { color: light ? lightRamp : ramp },
                itemHeight: 90,
                itemWidth: 12,
                showLabel: true,
            },
            series: [{
                type: 'map',
                map: 'world',
                roam: true,
                scaleLimit: { min: 0.7, max: 12 },
                zoom: 1.05,
                label: {
                    show: false,
                    color: text,
                    fontSize: 10,
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    textBorderColor: light ? '#ffffff' : 'rgba(0,0,0,0.6)',
                    textBorderWidth: 2
                },
                emphasis: {
                    label: { show: true, color: text, fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' },
                    itemStyle: {
                        areaColor: light ? '#ff4a4a' : '#00ff41',
                        borderColor: border,
                        borderWidth: 1.5
                    }
                },
                itemStyle: {
                    areaColor: light ? '#d9e1ec' : '#0b1020',
                    borderColor: border,
                    borderWidth: 0.8
                },
                data: this.totals()
            }]
        };
    },

    /**
     * Converts backend country tallies ({code,count}) into ECharts map data
     * keyed by the world.json feature name.
     */
    totals() {
        const rows = (this.data && this.data.countries) || [];
        const names = window.PHIS_COUNTRY_NAMES || {};
        const counts = {};
        rows.forEach(r => {
            const name = names[r.code];
            if (name) counts[name] = (counts[name] || 0) + r.count;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },

    /**
     * Re-render the chart (fetches fresh data from the backend).
     */
    async render() {
        const mapEl = document.getElementById('threatMap');
        const badge = document.getElementById('threatMapBadge');
        const subtitle = document.getElementById('threatMapSubtitle');
        const emptyEl = document.getElementById('threatMapEmpty');

        if (!mapEl) return;

        try {
            const resp = await fetch('http://localhost:3000/api/threats/map');
            if (!resp.ok) throw new Error('backend returned ' + resp.status);
            this.data = await resp.json();
        } catch (err) {
            console.warn('Threat map fetch failed:', err);
            this.showUnavailable('Live threat feed is offline.');
            if (badge) {
                badge.classList.remove('gray');
                badge.classList.add('gray');
                badge.innerHTML = '<span class="badge-dot"></span>Offline';
            }
            return;
        }

        const total = this.data.countries.reduce((s, c) => s + c.count, 0) || 0;

        // VisualMap auto-ranges against the real max so "100" isn't hardcoded.
        const max = Math.max(1, ...this.data.countries.map(c => c.count));

        if (this.worldGeo) {
            try {
                echarts.registerMap('world', this.worldGeo);
                const el = mapEl;
                el.style.display = '';
                el.innerHTML = '';
                this.chart = echarts.init(el, null, { renderer: 'svg' });
                const opt = this.buildOption();
                opt.visualMap.max = max;
                this.chart.setOption(opt, true);
                this.loaded = true;
            } catch (err) {
                console.warn('Threat map render failed:', err);
                this.showUnavailable('Map rendering failed — check the console for details.');
                if (badge) {
                    badge.className = 'status-badge gray';
                    badge.innerHTML = '<span class="badge-dot"></span>Offline';
                }
                return;
            }
        }

        if (emptyEl) emptyEl.classList.add('hidden');
        if (badge) {
            badge.className = 'status-badge green';
            badge.innerHTML = '<span class="badge-dot"></span>Live';
        }
        if (subtitle) {
            subtitle.textContent = `Top hotspot: ${this.topCountry()} · ${total.toLocaleString()} recent URLs tracked across ${this.data.countries.length} countries`;
        }
    },

    topCountry() {
        const rows = (this.data && this.data.countries) || [];
        if (!rows.length) return 'No data';
        const name = window.PHIS_COUNTRY_NAMES[rows[0].code] || rows[0].code;
        return `${name} (${rows[0].count.toLocaleString()})`;
    },

    showUnavailable(message) {
        const mapEl = document.getElementById('threatMap');
        const emptyEl = document.getElementById('threatMapEmpty');
        if (emptyEl) {
            emptyEl.querySelector('p').textContent = message;
            emptyEl.classList.remove('hidden');
        }
        if (mapEl) mapEl.style.display = 'none';
    },

    /**
     * Re-theme the live chart when dark/light is toggled.
     */
    bindThemeToggle() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            setTimeout(() => {
                if (this.chart) {
                    const max = Math.max(1, ...((this.data && this.data.countries) || []).map(c => c.count));
                    const opt = this.buildOption();
                    opt.visualMap.max = max;
                    this.chart.setOption(opt, true);
                }
            }, 250);
        });
    }
};

// Export for use in other modules
window.ThreatMap = ThreatMap;