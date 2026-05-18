/**
 * JBCL Web Interface - Uses local proxy on ches.dev
 * Clean API integration via your Cloudflare Worker
 */

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const CONFIG = {
        // Your Cloudflare Worker proxy (runs on your domain - no CORS!)
        API_BASE: '/api',
        
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
        theme: localStorage.getItem('jbcl_theme') || 'dark',
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
    // API - Using your local proxy
    // ========================================
    async function api(endpoint, options = {}) {
        const now = Date.now();
        if (now - state.lastApiCall < CONFIG.RATE_LIMIT) {
            await sleep(CONFIG.RATE_LIMIT - (now - state.lastApiCall));
        }
        state.lastApiCall = Date.now();

        const url = `${CONFIG.API_BASE}${endpoint}`;
        
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            
            return await res.json();
        } catch (err) {
            console.error('API error:', err);
            return null;
        }
    }

    async function searchItems(query) {
        if (!query.trim()) return [];
        
        const cacheKey = query.toLowerCase();
        if (state.searchCache.has(cacheKey)) {
            return state.searchCache.get(cacheKey);
        }
        
        // Use local proxy - no CORS!
        const data = await api(`/items?name=${encodeURIComponent(query)}`);
        
        if (data && data.length) {
            state.searchCache.set(cacheKey, data);
        }
        
        return data || [];
    }

    async function getUserId(username) {
        if (/^\d+$/.test(username)) return username;
        
        const data = await api('/users', {
            method: 'POST',
            body: JSON.stringify({ usernames: [username] }),
        });
        
        return data?.data?.[0]?.id?.toString() || null;
    }

    async function checkDupes(userId) {
        const data = await api(`/dupes?id=${userId}`);
        
        if (data === null) return null;
        if (data?.data === undefined) return [];
        return data.data || [];
    }

    async function getInventory(userId) {
        return await api(`/inventory?id=${userId}`);
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
            
            return `
                <div class="item-card" data-index="${i}">
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
                        <span>${item.demand || 'N/A'}</span>
                        <span>${item.trend || 'N/A'}</span>
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
                container.innerHTML = '<div class="empty-state" style="padding:24px"><p style="color:var(--text-muted)">No items</p></div>';
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
        const isEmpty = !dupes || dupes.length === 0;
        
        container.innerHTML = `
            <div class="dupe-header">
                <h3>${username}</h3>
                ${isEmpty 
                    ? '<span class="clean-badge">✓ Clean</span>' 
                    : `<span class="dupe-badge">⚠ ${dupes.length} Duped</span>`}
            </div>
            ${isEmpty 
                ? '<p style="color:var(--text-secondary)">No duplicate items found.</p>'
                : `<div class="dupe-list">
                    ${dupes.map(d => `
                        <div class="dupe-list-item">
                            <div>
                                <h4>${d.title || 'Unknown Item'}</h4>
                                <span class="meta">Trades: ${d.timesTraded || 0}</span>
                            </div>
                            <span class="ratio">${d.dupe_ratio || 'N/A'}</span>
                        </div>
                    `).join('')}
                </div>`}
        `;
    }

    // ========================================
    // Inventory Results
    // ========================================
    function renderInvResults(data, username, userId) {
        const container = document.getElementById('inv-results');
        
        if (!data?.data?.length) {
            container.innerHTML = `
                <div class="dupe-header">
                    <h3>${username}</h3>
                    <span>ID: ${userId}</span>
                </div>
                <p style="color:var(--text-secondary)">No inventory data available.</p>
            `;
            return;
        }
        
        const items = data.data.slice(0, 20);
        
        container.innerHTML = `
            <div class="dupe-header">
                <h3>${username}</h3>
                <span>ID: ${userId}</span>
            </div>
            <div class="inv-list">
                ${items.map(item => `
                    <div class="inv-item">
                        <span class="inv-name">${item.name || 'Unknown'}</span>
                        <span class="inv-type">${item.type || ''}</span>
                    </div>
                `).join('')}
            </div>
            ${data.data.length > 20 ? `<p style="color:var(--text-muted);margin-top:8px">+ ${data.data.length - 20} more items</p>` : ''}
        `;
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
        document.documentElement.dataset.theme = state.theme;
        
        document.getElementById('theme-toggle').addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = state.theme;
            localStorage.setItem('jbcl_theme', state.theme);
        });
    }

    // ========================================
    // Initialize
    // ========================================
    document.addEventListener('DOMContentLoaded', async () => {
        initNavigation();
        initTheme();
        
        // Check API health
        try {
            const health = await fetch('/api/health');
            if (!health.ok) {
                console.warn('API proxy not responding');
            }
        } catch (e) {
            console.warn('API proxy not available');
        }
        
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
                showToast(`Added ${items[0].name}`, 'success');
            } else {
                showToast('Item not found', 'error');
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
            
            const data = await getInventory(userId);
            renderInvResults(data, username, userId);
        };
        
        invSearch.addEventListener('keypress', e => e.key === 'Enter' && doInvCheck());
        invBtn.addEventListener('click', doInvCheck);
    });
})();