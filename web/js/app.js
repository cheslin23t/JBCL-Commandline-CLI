/**
 * JBCL - Premium Trading Interface JS
 * Uses your Cloudflare Worker API
 */

(function() {
    'use strict';

    // ========================================
    // Configuration - Your Worker URL
    // ========================================
    const CONFIG = {
        API_BASE: 'https://jbcl-api.cheslin23t.workers.dev',
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
        apiConnected: false,
    };

    // ========================================
    // Utilities
    // ========================================
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

    async function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ========================================
    // API - Using Your Cloudflare Worker
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
            state.apiConnected = false;
            updateApiStatus();
            return null;
        }
    }

    async function searchItems(query) {
        if (!query.trim()) return [];
        
        const cacheKey = query.toLowerCase();
        if (state.searchCache.has(cacheKey)) {
            return state.searchCache.get(cacheKey);
        }
        
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

    function updateApiStatus() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.api-status span');
        
        if (statusDot && statusText) {
            if (state.apiConnected) {
                statusDot.style.background = '#22c55e';
                statusText.textContent = 'API Connected';
            } else {
                statusDot.style.background = '#ef4444';
                statusText.textContent = 'API Disconnected';
            }
        }
    }

    // ========================================
    // UI - Results
    // ========================================
    function renderItems(items, container) {
        if (!items?.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="28" cy="28" r="20"/>
                            <path d="m48 48-13.5-13.5"/>
                            <circle cx="28" cy="28" r="6"/>
                        </svg>
                    </div>
                    <h3>No items found</h3>
                    <p>Try a different search term</p>
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
        items.slice(0, 1).forEach(item => {
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
        const render = (items, containerId, side) => {
            const container = document.getElementById(containerId);
            if (!items.length) {
                container.innerHTML = '<div class="empty-panel">Add items to calculate</div>';
                return;
            }
            
            container.innerHTML = items.map((item, i) => `
                <div class="calc-item">
                    <div>
                        <span class="calc-item-name">${item.name}</span>
                        <span class="calc-item-status ${item.duped ? 'duped' : 'clean'}">${item.duped ? 'D' : 'C'}</span>
                    </div>
                    <div style="display:flex;align-items:center">
                        <span class="calc-item-value">${formatValue(item.value)}</span>
                        <button class="calc-item-remove" data-side="${side}" data-index="${i}">×</button>
                    </div>
                </div>
            `).join('');
            
            container.querySelectorAll('.calc-item-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    removeFromTrade(btn.dataset.side, parseInt(btn.dataset.index));
                });
            });
        };
        
        render(state.yourItems, 'your-items', 'your');
        render(state.theirItems, 'their-items', 'their');
        
        const yourTotal = state.yourItems.reduce((s, i) => s + i.value, 0);
        const theirTotal = state.theirItems.reduce((s, i) => s + i.value, 0);
        
        document.getElementById('your-total').textContent = formatValue(yourTotal);
        document.getElementById('their-total').textContent = formatValue(theirTotal);
    }

    function updateFairness() {
        const yourTotal = state.yourItems.reduce((s, i) => s + i.value, 0);
        const theirTotal = state.theirItems.reduce((s, i) => s + i.value, 0);
        
        let percent = 0;
        let text = 'Add items to analyze';
        
        if (yourTotal > 0 && theirTotal > 0) {
            const ratio = yourTotal / theirTotal;
            
            if (ratio >= 0.95 && ratio <= 1.05) {
                percent = 100;
                text = '✓ Fair Trade';
            } else if (ratio >= 0.85 && ratio <= 1.15) {
                percent = 70;
                text = '~ Slight Imbalance';
            } else if (ratio > 1) {
                percent = Math.max(10, 100 - (ratio - 1) * 50);
                text = '↑ You Overpay';
            } else {
                percent = Math.max(10, 100 - (1 - ratio) * 50);
                text = '↓ You Underpay';
            }
        }
        
        const fill = document.getElementById('fairness-fill');
        if (fill) {
            fill.style.width = percent + '%';
            if (percent >= 70) fill.style.background = '#22c55e';
            else if (percent >= 40) fill.style.background = '#eab308';
            else fill.style.background = '#ef4444';
        }
        
        const textEl = document.getElementById('fairness-text');
        if (textEl) textEl.textContent = text;
    }

    function clearTrade() {
        state.yourItems = [];
        state.theirItems = [];
        renderTradeItems();
        updateFairness();
        showToast('Trade cleared', 'info');
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
            const health = await fetch(CONFIG.API_BASE + '/health');
            if (health.ok) {
                state.apiConnected = true;
            }
        } catch (e) {
            state.apiConnected = false;
        }
        updateApiStatus();
        
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
                results.innerHTML = '<div class="empty-state"><h3>User not found</h3><p>Check the username and try again</p></div>';
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
                results.innerHTML = '<div class="empty-state"><h3>User not found</h3><p>Check the username and try again</p></div>';
                return;
            }
            
            const data = await getInventory(userId);
            renderInvResults(data, username, userId);
        };
        
        invSearch.addEventListener('keypress', e => e.key === 'Enter' && doInvCheck());
        invBtn.addEventListener('click', doInvCheck);
    });
})();