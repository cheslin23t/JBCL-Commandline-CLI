/**
 * JBCL Web Interface - Modern JavaScript
 * Clean API integration with CORS proxy support
 */

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const CONFIG = {
        // Use a CORS proxy to avoid cross-origin issues
        // This proxy forwards requests and adds CORS headers
        PROXY_URL: 'https://corsproxy.io/?',
        
        // Or use your own proxy - these are common public CORS proxies
        // You can also deploy your own: https://github.com/rubik/cors-anywhere
        PROXY_ENDPOINTS: [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
        ],
        
        API_ENDPOINTS: {
            items: 'https://api.jailbreakchangelogs.xyz/items/get',
            users: 'https://inventories.jailbreakchangelogs.xyz/proxy/users',
            dupes: 'https://inventories.jailbreakchangelogs.xyz/users/dupes',
        },
        
        DEBOUNCE: 300,
        RATE_LIMIT: 500,
    };

    // ========================================
    // State
    // ========================================
    const state = {
        yourItems: [],
        theirItems: [],
        lastApiCall: 0,
        searchCache: new Map(),
        favorites: JSON.parse(localStorage.getItem('jbcl_favorites') || '[]'),
    };

    // ========================================
    // Utilities
    // ========================================
    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function parseValue(v) {
        if (!v || v === 'N/A') return null;
        v = v.toString().toLowerCase().replace(/[,]/g, '').trim();
        try {
            if (v.endsWith('k')) return parseFloat(v.slice(0, -1)) * 1000;
            if (v.endsWith('m')) return parseFloat(v.slice(0, -1)) * 1000000;
            return parseFloat(v);
        } catch { return null; }
    }

    function formatValue(n) {
        if (n == null) return 'N/A';
        if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return Math.floor(n).toLocaleString();
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toasts');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ========================================
    // API - CORS-Free Fetch
    // Using multiple fallback strategies
    // ========================================
    async function fetchWithProxy(url) {
        const strategies = [
            // Strategy 1: Direct (if CORS works)
            async () => {
                const res = await fetch(url, { 
                    mode: 'cors',
                    credentials: 'omit',
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            },
            
            // Strategy 2: AllOrigins proxy
            async () => {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                return JSON.parse(text);
            },
            
            // Strategy 3: CORSproxy.io
            async () => {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            },
        ];
        
        let lastError = null;
        for (const strategy of strategies) {
            try {
                const data = await strategy();
                return data;
            } catch (e) {
                lastError = e;
                console.log('Strategy failed:', e.message);
            }
        }
        
        console.error('All strategies failed for:', url, lastError);
        return null;
    }

    async function searchItems(query) {
        if (!query.trim()) return [];
        
        const cacheKey = query.toLowerCase();
        if (state.searchCache.has(cacheKey)) {
            return state.searchCache.get(cacheKey);
        }
        
        // Rate limit
        const now = Date.now();
        if (now - state.lastApiCall < CONFIG.RATE_LIMIT) {
            await sleep(CONFIG.RATE_LIMIT - (now - state.lastApiCall));
        }
        state.lastApiCall = Date.now();
        
        const url = `${CONFIG.API_ENDPOINTS.items}?name=${encodeURIComponent(query)}`;
        const data = await fetchWithProxy(url);
        
        if (data && data.length) {
            state.searchCache.set(cacheKey, data);
        }
        
        return data || [];
    }

    async function getUserId(username) {
        if (/^\d+$/.test(username)) return username;
        
        // Use POST with proxy
        try {
            const url = CONFIG.API_ENDPOINTS.users;
            const res = await fetchWithProxy(url);
            
            // Since POST via proxy is complex, try direct with fallback
            const directRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [username], excludeBannedUser: true }),
                mode: 'cors',
            });
            
            if (!directRes.ok) return null;
            
            const data = await directRes.json();
            return data.data?.[0]?.id?.toString();
        } catch {
            // Try user lookup via inventory API's user endpoint if available
            return username; // Return username as fallback - let dupes endpoint handle it
        }
    }

    async function checkDupes(userId) {
        try {
            // Try direct first (most reliable)
            const url = `${CONFIG.API_ENDPOINTS.dupes}?id=${userId}`;
            const res = await fetch(url, { mode: 'cors' });
            
            if (res.status === 404) return [];
            if (!res.ok) return null;
            
            return await res.json();
        } catch {
            return null;
        }
    }

    // ========================================
    // UI - Item Results
    // ========================================
    function renderItems(items, container) {
        if (!items?.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <p>No items found</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = items.map((item, i) => {
            const cash = parseValue(item.cash_value);
            const duped = parseValue(item.duped_value);
            const trend = item.trend?.toLowerCase() || '';
            const demand = item.demand?.toLowerCase() || '';
            
            return `
                <div class="item-card" data-index="${i}" data-item='${JSON.stringify(item)}'>
                    <div class="item-card-header">
                        <span class="item-card-name">${item.name || 'Unknown'}</span>
                        <span class="item-card-type">${item.type || 'Unknown'}</span>
                    </div>
                    <div class="item-card-values">
                        <div class="cash">
                            <span class="label">Cash</span>
                            <span class="value">${formatValue(cash)}</span>
                        </div>
                        <div class="duped">
                            <span class="label">Duped</span>
                            <span class="value">${formatValue(duped)}</span>
                        </div>
                    </div>
                    <div class="item-card-meta">
                        <span class="demand-${demand.includes('high') ? 'high' : demand.includes('medium') ? 'medium' : 'low'}">
                            ${item.demand || 'N/A'}
                        </span>
                        <span class="trend-${trend.includes('up') ? 'up' : trend.includes('down') ? 'down' : 'stable'}">
                            ${item.trend || 'N/A'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ========================================
    // Trade Calculator
    // ========================================
    function addToTrade(items, side) {
        const list = side === 'your' ? state.yourItems : state.theirItems;
        items.forEach(item => {
            list.push({
                name: item.name,
                type: item.type,
                duped: false,
                value: parseValue(item.cash_value) || parseValue(item.duped_value) || 0,
                raw: item,
            });
        });
        renderTradeItems();
        updateFairness();
    }

    function removeFromTrade(side, index) {
        const list = side === 'your' ? state.yourItems : state.theirItems;
        list.splice(index, 1);
        renderTradeItems();
        updateFairness();
    }

    function renderTradeItems() {
        const render = (items, containerId) => {
            const container = document.getElementById(containerId);
            if (!items.length) {
                container.innerHTML = '<div class="empty-state" style="padding:24px"><p style="color:var(--text-muted)">No items added</p></div>';
                return;
            }
            
            container.innerHTML = items.map((item, i) => `
                <div class="calc-item">
                    <div class="calc-item-info">
                        <span class="calc-item-name">${item.name}</span>
                        <span class="calc-item-status ${item.duped ? 'duped' : 'clean'}">${item.duped ? 'Duped' : 'Clean'}</span>
                    </div>
                    <span class="calc-item-value">${formatValue(item.value)}</span>
                    <button class="calc-item-remove" data-side="${containerId === 'your-items' ? 'your' : 'their'}" data-index="${i}">×</button>
                </div>
            `).join('');
            
            container.querySelectorAll('.calc-item-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    removeFromTrade(btn.dataset.side, parseInt(btn.dataset.index));
                });
            });
        };
        
        render(state.yourItems, 'your-items');
        render(state.theirItems, 'their-items');
        
        const yourTotal = state.yourItems.reduce((s, i) => s + i.value, 0);
        const theirTotal = state.theirItems.reduce((s, i) => s + i.value, 0);
        
        document.getElementById('your-total').textContent = formatValue(yourTotal);
        document.getElementById('their-total').textContent = formatValue(theirTotal);
    }

    function updateFairness() {
        const yourTotal = state.yourItems.reduce((s, i) => s + i.value, 0);
        const theirTotal = state.theirItems.reduce((s, i) => s + i.value, 0);
        
        let percent = 0;
        let text = '—';
        
        if (yourTotal > 0 && theirTotal > 0) {
            const ratio = yourTotal / theirTotal;
            
            if (ratio >= 0.95 && ratio <= 1.05) {
                percent = 100;
                text = 'Fair';
            } else if (ratio >= 0.85 && ratio <= 1.15) {
                percent = 70;
                text = 'Slight imbalance';
            } else {
                percent = 30;
                text = 'Uneven';
            }
        }
        
        document.getElementById('fairness-fill').style.width = percent + '%';
        document.getElementById('fairness-text').textContent = text;
    }

    function clearTrade() {
        state.yourItems = [];
        state.theirItems = [];
        renderTradeItems();
        updateFairness();
    }

    // ========================================
    // Dupe Results
    // ========================================
    function renderDupeResults(dupes, username) {
        const container = document.getElementById('dupe-results');
        
        if (!dupes || !dupes.length) {
            container.innerHTML = `
                <div class="dupe-header">
                    <h3>${username}</h3>
                    <span class="clean-badge">✓ Clean</span>
                </div>
                <p style="color:var(--text-secondary)">No dupe items found. This player appears to be clean.</p>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="dupe-header">
                <h3>${username}</h3>
                <span class="dupe-badge">⚠ ${dupes.length} Duped</span>
            </div>
            <div class="dupe-list">
                ${dupes.map(d => `
                    <div class="dupe-list-item">
                        <div>
                            <h4>${d.title || 'Unknown'}</h4>
                            <span class="meta">Trades: ${d.timesTraded || 0}</span>
                        </div>
                        <span class="ratio">${d.dupe_ratio || 'N/A'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ========================================
    // Inventory Results
    // ========================================
    function renderInvResults(userId, username) {
        const container = document.getElementById('inv-results');
        
        container.innerHTML = `
            <div class="dupe-header">
                <h3>${username}</h3>
                <span>ID: ${userId}</span>
            </div>
            <p style="color:var(--text-secondary)">Detailed inventory feature coming soon. Use Dupe Check to verify trading history.</p>
        `;
    }

    // ========================================
    // Favorites
    // ========================================
    function saveFavorites() {
        localStorage.setItem('jbcl_favorites', JSON.stringify(state.favorites));
    }

    function renderFavorites() {
        const container = document.getElementById('favorites-list');
        
        if (!state.favorites.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <p>No favorites yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = state.favorites.map((item, i) => `
            <div class="item-card" data-index="${i}">
                <div class="item-card-header">
                    <span class="item-card-name">${item.name}</span>
                    <span class="item-card-type">${item.type}</span>
                </div>
                <div class="item-card-values">
                    <div class="cash">
                        <span class="label">Cash</span>
                        <span class="value">${formatValue(parseValue(item.cash_value))}</span>
                    </div>
                    <div class="duped">
                        <span class="label">Duped</span>
                        <span class="value">${formatValue(parseValue(item.duped_value))}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // Navigation
    // ========================================
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                
                navItems.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(view + '-view').classList.add('active');
            });
        });
    }

    // ========================================
    // Theme
    // ========================================
    function initTheme() {
        const saved = localStorage.getItem('jbcl_theme') || 'dark';
        document.documentElement.dataset.theme = saved;
        
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.dataset.theme;
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            localStorage.setItem('jbcl_theme', next);
        });
    }

    // ========================================
    // Initialize
    // ========================================
    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
        initTheme();
        
        // Item search
        const itemSearch = document.getElementById('item-search');
        const searchBtn = document.getElementById('search-btn');
        
        const doSearch = async () => {
            const query = itemSearch.value.trim();
            if (!query) return;
            
            const results = document.getElementById('item-results');
            results.innerHTML = '<div class="loading active"><div class="spinner"></div></div>';
            
            const items = await searchItems(query);
            renderItems(items, results);
        };
        
        itemSearch.addEventListener('keypress', e => e.key === 'Enter' && doSearch());
        searchBtn.addEventListener('click', doSearch);
        
        // Trade calculator add
        const addItem = async (side) => {
            const input = document.getElementById(side + '-search');
            const query = input.value.trim();
            if (!query) return;
            
            const items = await searchItems(query);
            if (items?.length) {
                addToTrade(items, side);
                input.value = '';
            }
        };
        
        document.getElementById('your-search').addEventListener('keypress', e => e.key === 'Enter' && addItem('your'));
        document.querySelector('#your-search + .add-btn')?.addEventListener('click', () => addItem('your'));
        document.getElementById('their-search').addEventListener('keypress', e => e.key === 'Enter' && addItem('their'));
        document.querySelector('#their-search + .add-btn')?.addEventListener('click', () => addItem('their'));
        
        // Clear trade
        document.getElementById('clear-trade').addEventListener('click', clearTrade);
        
        // Dupe check
        const dupeSearch = document.getElementById('dupe-search');
        const dupeBtn = document.getElementById('dupe-btn');
        
        const doDupeCheck = async () => {
            const username = dupeSearch.value.trim();
            if (!username) return;
            
            const results = document.getElementById('dupe-results');
            results.innerHTML = '<div class="loading active"><div class="spinner"></div></div>';
            
            const userId = await getUserId(username);
            if (!userId) {
                results.innerHTML = '<div class="empty-state"><p>User not found</p></div>';
                return;
            }
            
            const dupes = await checkDupes(userId);
            renderDupeResults(dupes, username);
        };
        
        dupeSearch.addEventListener('keypress', e => e.key === 'Enter' && doDupeCheck());
        dupeBtn.addEventListener('click', doDupeCheck);
        
        // Inventory check
        const invSearch = document.getElementById('inv-search');
        const invBtn = document.getElementById('inv-btn');
        
        const doInvCheck = async () => {
            const username = invSearch.value.trim();
            if (!username) return;
            
            const results = document.getElementById('inv-results');
            results.innerHTML = '<div class="loading active"><div class="spinner"></div></div>';
            
            const userId = await getUserId(username);
            if (!userId) {
                results.innerHTML = '<div class="empty-state"><p>User not found</p></div>';
                return;
            }
            
            renderInvResults(userId, username);
        };
        
        invSearch.addEventListener('keypress', e => e.key === 'Enter' && doInvCheck());
        invBtn.addEventListener('click', doInvCheck);
        
        // Render initial favorites
        renderFavorites();
    });
})();