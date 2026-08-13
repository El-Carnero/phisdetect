/**
 * profile.js — Profile Manager
 * PhisDetect — Terminal Dashboard
 */

const ProfileManager = {
    /**
     * User data
     */
    user: {
        username: 'Guest User',
        email: null,
        points: 0,
        reports: 0,
        rank: '--'
    },

    /**
     * Initialize profile manager
     */
    init() {
        this.loadFromStorage();
        this.setupToggle();
        this.setupSettings();
        this.setupLogout();
        this.setupSignIn();
        this.restoreSession();
        this.render();
    },

    /**
     * If a session token exists, restore the account from the server.
     */
    restoreSession() {
        if (typeof AuthManager === 'undefined' || !AuthManager.isLoggedIn) return;
        AuthManager.me().then(user => {
            if (user) {
                this.setLoggedInUser(user);
            } else {
                this.setGuestUser();
            }
        }).catch(() => this.setGuestUser());
    },

    /**
     * Load user data from localStorage
     */
    loadFromStorage() {
        if (this.isLoggedIn()) return;
        try {
            const saved = localStorage.getItem('phisdetect-user');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.user = { ...this.user, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load user data:', e);
        }
    },

    /**
     * Save guest user data to localStorage
     */
    saveToStorage() {
        if (this.isLoggedIn()) return;
        try {
            localStorage.setItem('phisdetect-user', JSON.stringify(this.user));
        } catch (e) {
            console.warn('Failed to save user data:', e);
        }
    },

    isLoggedIn() {
        return typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn && !!this.user.email;
    },

    /**
     * Populate the profile from a server user object.
     */
    setLoggedInUser(user) {
        this.user = {
            username: user.name || (user.email || 'User').split('@')[0],
            email: user.email,
            points: user.points || 0,
            reports: user.reports || 0,
            rank: user.rank != null ? user.rank : '--'
        };
        this.render();
        this.syncSignInButton();
    },

    /**
     * Reset to the local guest profile.
     */
    setGuestUser() {
        this.user = { username: 'Guest User', email: null, points: 0, reports: 0, rank: '--' };
        this.render();
        this.syncSignInButton();
    },

    /**
     * Add points (and optionally reports) to the profile.
     * For logged-in users points are computed on the server from threat
     * reports (+10) and minigame scores, so the account is never mutated here —
     * the local update is only a visual preview until refreshFromServer() runs.
     */
    addPoints(points, reports) {
        points = points || 0;
        reports = reports || 0;
        this.user.points += points;
        this.user.reports += reports;
        this.saveToStorage();
        this.render();
    },

    /**
     * Re-fetch the account from the server so the profile shows the
     * authoritative computed points (reports*10 + minigames).
     */
    async refreshFromServer() {
        if (this.isLoggedIn() && typeof AuthManager !== 'undefined') {
            try {
                const user = await AuthManager.me();
                if (user) this.setLoggedInUser(user);
            } catch (e) {
                /* keep the current profile on network errors */
            }
        }
    },

    /**
     * Render profile in dropdown
     */
    render() {
        const panel = document.getElementById('profilePanel');
        if (!panel) return;

        const nameEl = panel.querySelector('.profile-name');
        const emailEl = panel.querySelector('.profile-email');
        const pointsEl = panel.querySelector('.profile-points');
        const stats = panel.querySelectorAll('.stat-value');

        if (nameEl) nameEl.textContent = this.user.username;
        if (emailEl) emailEl.textContent = this.user.email || '';
        if (pointsEl) pointsEl.innerHTML = `<i class="fa-regular fa-star" style="color: #f59e0b;"></i> ${this.user.points} points`;
        if (stats.length >= 2) {
            stats[0].textContent = this.user.reports;
            stats[1].textContent = this.user.rank === '--' ? '#--' : `#${this.user.rank}`;
        }

        this.syncSignInButton();
    },

    /**
     * Show/hide the sign-in entry depending on login state.
     */
    syncSignInButton() {
        document.querySelectorAll('#signinBtn, #signinBtnDropdown').forEach(btn => {
            if (btn) btn.style.display = this.isLoggedIn() ? 'none' : 'flex';
        });
    },

    /**
     * Update user data
     */
    updateUser(data) {
        this.user = { ...this.user, ...data };
        this.saveToStorage();
        this.render();
    },

    /**
     * Toggle profile panel
     */
    toggle() {
        const panel = document.getElementById('profilePanel');
        const notifPanel = document.getElementById('notificationPanel');
        
        if (!panel) return;

        // Close notification panel if open
        if (notifPanel) {
            notifPanel.classList.remove('show');
            notifPanel.style.display = 'none';
            notifPanel.setAttribute('aria-hidden', 'true');
        }
        
        // Toggle profile panel
        const isOpen = panel.classList.contains('show');
        
        if (isOpen) {
            panel.classList.remove('show');
            panel.style.display = 'none';
            panel.setAttribute('aria-hidden', 'true');
            document.getElementById('profileButton')?.focus();
        } else {
            panel.classList.add('show');
            panel.style.display = 'block';
            panel.setAttribute('aria-hidden', 'false');
        }
    },

    /**
     * Setup profile toggle button
     */
    setupToggle() {
        const btn = document.getElementById('profileButton');
        if (btn && !btn.dataset.profileInit) {
            btn.dataset.profileInit = 'true';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
    },

    /**
     * Setup settings button
     */
    setupSettings() {
        const btn = document.getElementById('settingsBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                Utils.toast('Settings page coming soon!', 'info');
                this.closePanel();
            });
        }
    },

    /**
     * Setup sign-in buttons (shown when logged out)
     */
    setupSignIn() {
        const btns = document.querySelectorAll('#signinBtn, #signinBtnDropdown');
        btns.forEach(btn => {
            if (btn && !btn.dataset.signinInit) {
                btn.dataset.signinInit = 'true';
                btn.addEventListener('click', () => {
                    window.location.href = 'auth.html';
                });
            }
        });
    },

    /**
     * Setup logout button
     */
    setupLogout() {
        const logoutBtns = document.querySelectorAll('#logoutBtn, #logoutBtnDropdown');
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    Utils.confirmDialog('Are you sure you want to logout?', {
                        title: 'Logout',
                        confirmText: 'Logout'
                    }).then(confirmed => {
                        if (!confirmed) return;
                        if (this.isLoggedIn() && typeof AuthManager !== 'undefined') {
                            AuthManager.logout().then(() => this.setGuestUser());
                        } else {
                            this.setGuestUser();
                        }
                        localStorage.removeItem('phisdetect-user');
                        this.closePanel();
                        Utils.toast('Logged out!', 'success');
                    });
                });
            }
        });
    },

    /**
     * Close profile panel
     */
    closePanel() {
        const panel = document.getElementById('profilePanel');
        if (panel) {
            panel.classList.remove('show');
            panel.style.display = 'none';
        }
    },

    /**
     * Auto-dismiss panel on outside click
     */
    setupAutoDismiss() {
        if (this._autoDismissInit) return;
        this._autoDismissInit = true;

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('profilePanel');
            const btn = document.getElementById('profileButton');
            
            if (panel && btn) {
                const isPanelClick = panel.contains(e.target);
                const isBtnClick = btn.contains(e.target);
                
                if (!isPanelClick && !isBtnClick) {
                    panel.classList.remove('show');
                    panel.style.display = 'none';
                    panel.setAttribute('aria-hidden', 'true');
                }
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const panel = document.getElementById('profilePanel');
                if (panel && panel.classList.contains('show')) {
                    panel.classList.remove('show');
                    panel.style.display = 'none';
                    panel.setAttribute('aria-hidden', 'true');
                    document.getElementById('profileButton')?.focus();
                }
            }
        });
    }
};

// Export for use in other modules
window.ProfileManager = ProfileManager;
