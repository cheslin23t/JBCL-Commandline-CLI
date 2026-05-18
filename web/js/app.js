/**
 * JB-X Web Interface - Main Application
 * Jailbreak Trading Hub for Roblox
 */

// ========================================
// Configuration & Constants
// ========================================
const CONFIG = {
    // JailbreakChangelogs API endpoints
    API_BASE: 'https://api.jailbreakchangelogs.xyz',
    API_INVENTORY: 'https://inventories.jailbreakchangelogs.xyz',
    
    // API Routes
    ITEMS_GET: '/items/get',
    USERS_PROXY: '/proxy/users',
    DUPES: '/users/dupes',
    
    // UI Constants
    DEBOUNCE_MS: 300,
    RATE_LIMIT_MS: 500,
};

// ========================================
// State Management
// ========================================
const state = {
    // Trade Calculator State
    yourItems: [],
    theirItems: [],
    
    // Search Cache
    searchCache: new Map(),
    
    // Last API call timestamp (for rate limiting)
    lastApiCall: 0,
    
    // Selected items for comparison
    compareItems: [null, null],
};

// ========================================
// Utility Functions
// ========================================

/**
 * Debounce function for search inputs
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse value string to number
 * Supports K (thousands) and M (millions) suffixes
 */
function parseValue(valueStr) {
    if (!valueStr || valueStr === 'N/A') return null;
    valueStr = valueStr.toString().toLowerCase().replace(',', '').trim();
    
    try {
        if (valueStr.endsWith('k')) {
            return parseFloat(valueStr.slice(0, -1)) * 1000;
        } else if (valueStr.endsWith('m')) {
            return parseFloat(valueStr.slice(0, -1)) * 1000000;
        }
        return parseFloat(valueStr);
    } catch {
        return null;
    }
}

/**
 * Format number to readable string with K/M suffixes
 */
function formatValue(num) {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return Math.floor(num).toLocaleString();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// API Functions
// ========================================

/**
 * Fetch item data from JailbreakChangelogs API
 */
async function fetchItem(name) {
    // Check cache first
    const cacheKey = name.toLowerCase();
    if (state.searchCache.has(cacheKey)) {
        return state.searchCache.get(cacheKey);
    }
    
    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - state.lastApiCall;
    if (timeSinceLastCall < CONFIG.RATE_LIMIT_MS) {
        await sleep(CONFIG.RATE_LIMIT_MS - timeSinceLastCall);
    }
    state.lastApiCall = Date.now();
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}${CONFIG.ITEMS_GET}?name=${encodeURIComponent(name)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        state.searchCache.set(cacheKey, data);
        
        return data;
    } catch (error) {
        console.error('Error fetching item:', error);
        return null;
    }
}

/**
 * Get user ID from username
 */
async function getUserId(username) {
    if (/^\d+$/.test(username)) {
        return username; // Already a numeric ID
    }
    
    try {
        const response = await fetch(`${CONFIG.API_INVENTORY}${CONFIG.USERS_PROXY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUser: true })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return data.data[0].id.toString();
        }
        return null;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
}

/**
 * Check for dupes for a user
 */
async function checkDupes(userId) {
    try {
        const response = await fetch(`${CONFIG.API_INVENTORY}${CONFIG.DUPES}?id=${userId}`);
        
        if (response.status === 404) {
            return [];
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error checking dupes:', error);
        return null;
    }
}

// ========================================
// UI Rendering Functions
// ========================================

/**
 * Render item cards in search results
 */
function renderItemResults(items) {
    const container = document.getElementById('item-results');
    container.innerHTML = '';
    
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>No items found. Try a different search term.</span>
            </div>
        `;
        return;
    }
    
    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.dataset.index = index;
        card.dataset.item = JSON.stringify(item);
        
        const cashValue = parseValue(item.cash_value);
        const dupedValue = parseValue(item.duped_value);
        const trendClass = item.trend?.toLowerCase().includes('up') ? 'trend-up' :
                           item.trend?.toLowerCase().includes('down') ? 'trend-down' : 'trend-stable';
        const demandClass = item.demand?.toLowerCase().includes('high') ? 'demand-high' :
                           item.demand?.toLowerCase().includes('medium') ? 'demand-medium' : 'demand-low';
        
        card.innerHTML = `
            <div class="result-card-header">
                <h3>${item.name || 'Unknown Item'}</h3>
                <span class="item-type">${item.type || 'Unknown Type'}</span>
            </div>
            <div class="result-card-values">
                <div class="value-item cash">
                    <span class="value-label">Cash Value</span>
                    <span class="value-number">${formatValue(cashValue)}</span>
                </div>
                <div class="value-item duped">
                    <span class="value-label">Duped Value</span>
                    <span class="value-number">${formatValue(dupedValue)}</span>
                </div>
            </div>
            <div class="result-card-meta">
                <span class="meta-tag ${demandClass}">
                    📊 ${item.demand || 'N/A'}
                </span>
                <span class="meta-tag ${trendClass}">
                    ${item.trend?.toLowerCase().includes('up') ? '↑' : item.trend?.toLowerCase().includes('down') ? '↓' : '→'} ${item.trend || 'N/A'}
                </span>
            </div>
        `;
        
        // Click to open modal
        card.addEventListener('click', () => openItemModal(item));
        
        container.appendChild(card);
    });
}

/**
 * Render a trade item in the trade calculator
 */
function renderTradeItem(item, container, side) {
    const div = document.createElement('div');
    div.className = 'trade-item';
    div.innerHTML = `
        <div class="item-info">
            <div class="item-name">${item.name}</div>
            <span class="item-status ${item.duped ? 'duped' : 'clean'}">
                ${item.duped ? 'DUPED' : 'CLEAN'}
            </span>
        </div>
        <div class="item-actions">
            <span class="item-value">${formatValue(item.usedValue)}</span>
            <button class="remove-btn" data-side="${side}" data-index="${container.children.length}">×</button>
        </div>
    `;
    
    div.querySelector('.remove-btn').addEventListener('click', () => {
        removeFromTrade(side, parseInt(container.children.length) - 1);
    });
    
    container.appendChild(div);
}

/**
 * Update trade totals and summary
 */
function updateTradeSummary() {
    const yourTotal = state.yourItems.reduce((sum, item) => sum + (item.usedValue || 0), 0);
    const theirTotal = state.theirItems.reduce((sum, item) => sum + (item.usedValue || 0), 0);
    const difference = yourTotal - theirTotal;
    
    // Update totals in header
    document.getElementById('your-total').textContent = formatValue(yourTotal);
    document.getElementById('their-total').textContent = formatValue(theirTotal);
    
    // Update summary
    document.getElementById('summary-your-value').textContent = formatValue(yourTotal);
    document.getElementById('summary-their-value').textContent = formatValue(theirTotal);
    
    const netElement = document.getElementById('summary-net');
    const netValueElement = netElement.querySelector('.stat-value');
    
    if (difference > 0) {
        netValueElement.textContent = '+' + formatValue(difference);
        netElement.className = 'stat highlight positive';
    } else if (difference < 0) {
        netValueElement.textContent = formatValue(difference);
        netElement.className = 'stat highlight negative';
    } else {
        netValueElement.textContent = 'Equal';
        netElement.className = 'stat highlight';
    }
    
    // Update balance indicator
    const balanceIndicator = document.getElementById('trade-balance').querySelector('.balance-indicator');
    if (difference > 0) {
        balanceIndicator.textContent = '← You Overpay';
    } else if (difference < 0) {
        balanceIndicator.textContent = 'You Underpay →';
    } else {
        balanceIndicator.textContent = '⇌ Equal';
    }
    
    // Update trade rating
    const ratingContainer = document.getElementById('trade-rating');
    const percentDiff = Math.abs(difference) / Math.max(yourTotal, theirTotal, 1) * 100;
    
    let ratingHtml;
    if (percentDiff <= 5) {
        ratingHtml = '<span class="rating-badge good">✓ Fair Trade</span>';
    } else if (percentDiff <= 15) {
        ratingHtml = '<span class="rating-badge neutral">⚠ Slight Imbalance</span>';
    } else {
        ratingHtml = '<span class="rating-badge bad">✕ Uneven Trade</span>';
    }
    ratingContainer.innerHTML = ratingHtml;
}

/**
 * Add item to trade calculator
 */
function addToTrade(item, isDuped = false) {
    const itemValue = isDuped ? parseValue(item.duped_value) : parseValue(item.cash_value);
    
    const tradeItem = {
        name: item.name,
        type: item.type,
        duped: isDuped,
        usedValue: itemValue,
        cashValue: parseValue(item.cash_value),
        dupedValue: parseValue(item.duped_value),
        demand: item.demand,
        trend: item.trend
    };
    
    // Ask which side
    showSideChoice(tradeItem);
}

/**
 * Show side choice modal
 */
function showSideChoice(item) {
    const modal = document.getElementById('item-modal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <h3>Add "${item.name}" to:</h3>
        <div class="side-buttons">
            <button class="btn-primary" id="add-your-side">
                👤 Your Side
            </button>
            <button class="btn-primary" id="add-their-side">
                👥 Their Side
            </button>
            <button class="btn-secondary" id="cancel-add">
                Cancel
            </button>
        </div>
    `;
    
    document.getElementById('add-your-side').addEventListener('click', () => {
        state.yourItems.push(item);
        renderYourItems();
        updateTradeSummary();
        closeModal();
        showToast(`Added "${item.name}" to YOUR side`, 'success');
    });
    
    document.getElementById('add-their-side').addEventListener('click', () => {
        state.theirItems.push(item);
        renderTheirItems();
        updateTradeSummary();
        closeModal();
        showToast(`Added "${item.name}" to THEIR side`, 'success');
    });
    
    document.getElementById('cancel-add').addEventListener('click', closeModal);
    
    modal.classList.add('active');
}

/**
 * Render your items
 */
function renderYourItems() {
    const container = document.getElementById('your-items');
    container.innerHTML = '';
    
    if (state.yourItems.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>Add items from lookup or search</span></div>';
        return;
    }
    
    state.yourItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'trade-item';
        div.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <span class="item-status ${item.duped ? 'duped' : 'clean'}">
                    ${item.duped ? 'DUPED' : 'CLEAN'}
                </span>
            </div>
            <div class="item-actions">
                <span class="item-value">${formatValue(item.usedValue)}</span>
                <button class="remove-btn" data-side="your" data-index="${index}">×</button>
            </div>
        `;
        
        div.querySelector('.remove-btn').addEventListener('click', () => {
            removeFromTrade('your', index);
        });
        
        container.appendChild(div);
    });
}

/**
 * Render their items
 */
function renderTheirItems() {
    const container = document.getElementById('their-items');
    container.innerHTML = '';
    
    if (state.theirItems.length === 0) {
        container.innerHTML = '<div class="empty-state"><span>Add items from lookup or search</span></div>';
        return;
    }
    
    state.theirItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'trade-item';
        div.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <span class="item-status ${item.duped ? 'duped' : 'clean'}">
                    ${item.duped ? 'DUPED' : 'CLEAN'}
                </span>
            </div>
            <div class="item-actions">
                <span class="item-value">${formatValue(item.usedValue)}</span>
                <button class="remove-btn" data-side="their" data-index="${index}">×</button>
            </div>
        `;
        
        div.querySelector('.remove-btn').addEventListener('click', () => {
            removeFromTrade('their', index);
        });
        
        container.appendChild(div);
    });
}

/**
 * Remove item from trade
 */
function removeFromTrade(side, index) {
    if (side === 'your') {
        state.yourItems.splice(index, 1);
        renderYourItems();
    } else {
        state.theirItems.splice(index, 1);
        renderTheirItems();
    }
    updateTradeSummary();
    showToast('Item removed from trade', 'info');
}

/**
 * Clear all trade items
 */
function clearTrade() {
    state.yourItems = [];
    state.theirItems = [];
    renderYourItems();
    renderTheirItems();
    updateTradeSummary();
    showToast('Trade cleared', 'info');
}

/**
 * Export trade summary
 */
function exportTrade() {
    const yourTotal = state.yourItems.reduce((sum, item) => sum + (item.usedValue || 0), 0);
    const theirTotal = state.theirItems.reduce((sum, item) => sum + (item.usedValue || 0), 0);
    
    let exportText = `=== JB-X Trade Summary ===\n\n`;
    exportText += `YOUR SIDE (${formatValue(yourTotal)}):\n`;
    state.yourItems.forEach(item => {
        exportText += `  • ${item.name} ${item.duped ? '(D)' : '(C)'}: ${formatValue(item.usedValue)}\n`;
    });
    
    exportText += `\nTHEIR SIDE (${formatValue(theirTotal)}):\n`;
    state.theirItems.forEach(item => {
        exportText += `  • ${item.name} ${item.duped ? '(D)' : '(C)'}: ${formatValue(item.usedValue)}\n`;
    });
    
    exportText += `\nNET DIFFERENCE: ${formatValue(yourTotal - theirTotal)}`;
    
    // Show export modal
    const modal = document.getElementById('export-modal');
    document.getElementById('export-preview').innerHTML = `<pre>${exportText}</pre>`;
    modal.classList.add('active');
}

/**
 * Copy trade to clipboard
 */
function copyTradeToClipboard() {
    const preview = document.getElementById('export-preview').textContent;
    navigator.clipboard.writeText(preview).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

/**
 * Open item detail modal
 */
function openItemModal(item) {
    const modal = document.getElementById('item-modal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="item-detail">
            <h3>${item.name}</h3>
            <span class="item-type">${item.type || 'Unknown Type'}</span>
            
            <div class="detail-values">
                <div class="value-item cash">
                    <span class="value-label">Cash Value</span>
                    <span class="value-number">${formatValue(parseValue(item.cash_value))}</span>
                </div>
                <div class="value-item duped">
                    <span class="value-label">Duped Value</span>
                    <span class="value-number">${formatValue(parseValue(item.duped_value))}</span>
                </div>
            </div>
            
            <div class="detail-meta">
                <div class="meta-row">
                    <span class="meta-label">Demand:</span>
                    <span class="meta-value">${item.demand || 'N/A'}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Trend:</span>
                    <span class="meta-value">${item.trend || 'N/A'}</span>
                </div>
            </div>
            
            ${item.notes ? `<div class="detail-notes"><strong>Notes:</strong> ${item.notes}</div>` : ''}
            
            <div class="detail-actions">
                <button class="btn-primary" id="add-clean">Add (Clean)</button>
                <button class="btn-primary" id="add-duped">Add (Duped)</button>
            </div>
        </div>
    `;
    
    document.getElementById('add-clean').addEventListener('click', () => {
        addToTrade(item, false);
    });
    
    document.getElementById('add-duped').addEventListener('click', () => {
        addToTrade(item, true);
    });
    
    modal.classList.add('active');
}

/**
 * Close modal
 */
function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
}

/**
 * Render dupe check results
 */
function renderDupeResults(results, username, userId) {
    const container = document.getElementById('dupe-results');
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="dupe-header">
                <h3>Results for ${username}</h3>
                <span class="clean-badge">✓ Clean</span>
            </div>
            <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                No duped items found. This player appears to be clean!
            </p>
        `;
        return;
    }
    
    let html = `
        <div class="dupe-header">
            <h3>Duped Items for ${username} (${userId})</h3>
            <span class="warning-badge">⚠ ${results.length} Duped Item${results.length > 1 ? 's' : ''}</span>
        </div>
        <div class="dupe-list">
    `;
    
    results.forEach(dupe => {
        html += `
            <div class="dupe-item">
                <div class="dupe-item-info">
                    <h4>${dupe.title || 'Unknown Item'}</h4>
                    <div class="dupe-meta">
                        <span class="dupe-ratio">Ratio: ${dupe.dupe_ratio || 'N/A'}</span>
                        <span>Trades: ${dupe.timesTraded || 0}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Render inventory results
 */
async function renderInventoryResults(username) {
    const container = document.getElementById('inv-results');
    
    container.innerHTML = `
        <div class="player-header">
            <div class="player-avatar">👤</div>
            <div class="player-info">
                <h3>${username}</h3>
                <span class="player-id">Loading...</span>
            </div>
        </div>
        <p style="text-align: center; color: var(--text-secondary);">Fetching inventory data...</p>
    `;
    
    const userId = await getUserId(username);
    
    if (!userId) {
        container.innerHTML = `
            <div class="waitinng-state">
                <span class="icon">❌</span>
                <p>User not found: ${username}</p>
            </div>
        `;
        return;
    }
    
    // For now, show user info since full inventory API may not be accessible
    container.innerHTML = `
        <div class="player-header">
            <div class="player-avatar">👤</div>
            <div class="player-info">
                <h3>${username}</h3>
                <span class="player-id">User ID: ${userId}</span>
            </div>
        </div>
        <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
            Detailed inventory lookup coming soon!<br>
            Use the Dupe Check feature to verify trading history.
        </p>
    `;
}

// ========================================
// Search Functionality
// ========================================

/**
 * Handle item search
 */
async function handleSearch(query) {
    if (!query.trim()) {
        document.getElementById('item-results').innerHTML = '';
        return;
    }
    
    const loadingEl = document.getElementById('search-loading');
    loadingEl.classList.add('active');
    
    const results = await fetchItem(query);
    
    loadingEl.classList.remove('active');
    renderItemResults(results);
}

// ========================================
// Tab Navigation
// ========================================

/**
 * Switch between tabs
 */
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show target content
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-section`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// ========================================
// Theme Toggle
// ========================================

/**
 * Toggle light/dark theme
 */
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('jbx-theme') || 'dark';
    document.documentElement.dataset.theme = savedTheme;
    toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    
    toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = newTheme;
        localStorage.setItem('jbx-theme', newTheme);
        toggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

// ========================================
// Initialize Application
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab navigation
    initTabs();
    
    // Initialize theme toggle
    initThemeToggle();
    
    // Search input handler
    const searchInput = document.getElementById('item-search');
    const searchBtn = document.getElementById('search-btn');
    
    const debouncedSearch = debounce(() => {
        handleSearch(searchInput.value);
    }, CONFIG.DEBOUNCE_MS);
    
    searchInput.addEventListener('input', debouncedSearch);
    searchBtn.addEventListener('click', () => {
        handleSearch(searchInput.value);
    });
    
    // Enter key in search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch(searchInput.value);
        }
    });
    
    // Dupe check
    const dupeUserInput = document.getElementById('dupe-user');
    const checkDupeBtn = document.getElementById('check-dupe-btn');
    const dupeLoading = document.getElementById('dupe-loading');
    
    const handleDupeCheck = async () => {
        const username = dupeUserInput.value.trim();
        if (!username) {
            showToast('Please enter a username', 'error');
            return;
        }
        
        dupeLoading.classList.add('active');
        
        const userId = await getUserId(username);
        
        if (!userId) {
            dupeLoading.classList.remove('active');
            showToast('User not found', 'error');
            return;
        }
        
        const dupes = await checkDupes(userId);
        dupeLoading.classList.remove('active');
        
        if (dupes === null) {
            showToast('Failed to check dupe database', 'error');
            return;
        }
        
        renderDupeResults(dupes, username, userId);
    };
    
    checkDupeBtn.addEventListener('click', handleDupeCheck);
    dupeUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDupeCheck();
    });
    
    // Inventory check
    const invUserInput = document.getElementById('inv-user');
    const checkInvBtn = document.getElementById('check-inv-btn');
    const invLoading = document.getElementById('inv-loading');
    
    const handleInvCheck = async () => {
        const username = invUserInput.value.trim();
        if (!username) {
            showToast('Please enter a username', 'error');
            return;
        }
        
        invLoading.classList.add('active');
        await renderInventoryResults(username);
        invLoading.classList.remove('active');
    };
    
    checkInvBtn.addEventListener('click', handleInvCheck);
    invUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleInvCheck();
    });
    
    // Trade calculator controls
    document.getElementById('clear-trade').addEventListener('click', clearTrade);
    document.getElementById('export-trade').addEventListener('click', exportTrade);
    document.getElementById('copy-trade').addEventListener('click', copyTradeToClipboard);
    
    // Modal close handlers
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('export-modal-close').addEventListener('click', closeModal);
    
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    });
    
    // Populate sample trends (in real implementation, this would fetch from API)
    populateSampleTrends();
    
    console.log('JB-X Web Interface initialized!');
});

/**
 * Populate sample trends for demo
 */
function populateSampleTrends() {
    const samples = {
        'high-demand-list': [
            { name: 'Phantom', trend: '↑' },
            { name: 'Carbonara', trend: '↑' },
            { name: 'Veneno', trend: '↑' }
        ],
        'rising-trend-list': [
            { name: 'Tortoise', trend: '↑' },
            { name: 'Bull', trend: '↑' },
            { name: 'Roadster', trend: '↑' }
        ],
        'dropping-trend-list': [
            { name: 'Mclaren', trend: '↓' },
            { name: 'Lamborghini', trend: '↓' },
            { name: 'Ferrari', trend: '↓' }
        ],
        'stable-trend-list': [
            { name: 'Police Interpol', trend: '→' },
            { name: 'Armored Truck', trend: '→' },
            { name: 'Sedan', trend: '→' }
        ]
    };
    
    Object.entries(samples).forEach(([listId, items]) => {
        const container = document.getElementById(listId);
        if (container) {
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'trend-item';
                div.innerHTML = `
                    <span class="trend-item-name">${item.name}</span>
                    <span class="trend-arrow">${item.trend}</span>
                `;
                container.appendChild(div);
            });
        }
    });
}

// ========================================
// Export for debugging
// ========================================
window.JBX = {
    state,
    CONFIG,
    fetchItem,
    getUserId,
    checkDupes
};