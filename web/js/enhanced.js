/**
 * JB-X Web Interface - Enhanced Trading Features
 * Additional trading tools and analytics
 */

(function() {
    'use strict';

    // ========================================
    // Market Intelligence Module
    // ========================================
    
    /**
     * Fetch trending items from the API
     */
    async function fetchTrendingItems(limit = 10) {
        try {
            // Try to get items and sort by demand/trend
            const popularNames = [
                'phantom', 'carbonara', 'veneno', 'tortoise', 'bull',
                'mclaren', 'ferrari', 'lamborghini', 'roadster', 'sedan'
            ];
            
            const trending = [];
            for (const name of popularNames.slice(0, limit)) {
                const results = await window.JBX.fetchItem(name);
                if (results && results.length > 0) {
                    trending.push(results[0]);
                }
            }
            
            return trending;
        } catch (error) {
            console.error('Error fetching trending items:', error);
            return [];
        }
    }

    /**
     * Analyze trade fairness
     */
    function analyzeTradeFairness(yourItems, theirItems) {
        const yourTotal = yourItems.reduce((sum, item) => sum + (item.usedValue || 0), 0);
        const theirTotal = theirItems.reduce((sum, item) => sum + (item.usedValue || 0), 0);
        
        if (yourTotal === 0 || theirTotal === 0) {
            return {
                fair: true,
                score: 0,
                recommendation: 'Add items to both sides for analysis'
            };
        }
        
        const ratio = yourTotal / theirTotal;
        const percentDiff = Math.abs(ratio - 1) * 100;
        
        let fair = false;
        let score = 0;
        let recommendation = '';
        
        if (percentDiff <= 5) {
            fair = true;
            score = 100;
            recommendation = 'Excellent trade! Nearly equal value.';
        } else if (percentDiff <= 10) {
            fair = true;
            score = 80;
            recommendation = 'Good trade with slight variance.';
        } else if (percentDiff <= 20) {
            fair = false;
            score = 50;
            recommendation = 'Consider negotiating to close the gap.';
        } else {
            fair = false;
            score = 20;
            recommendation = 'Significant value imbalance detected.';
        }
        
        // Adjust score based on dupe ratio impact
        const yourDupes = yourItems.filter(i => i.duped).length;
        const theirDupes = theirItems.filter(i => i.duped).length;
        
        if (yourDupes > theirDupes) {
            recommendation += ' (Your side has more duped items - lower effective value)';
            score = Math.max(0, score - 10 * (yourDupes - theirDupes));
        } else if (theirDupes > yourDupes) {
            recommendation += ' (Their side has more duped items - lower effective value)';
        }
        
        return { fair, score: Math.round(score), recommendation };
    }

    /**
     * Suggest items based on trade gap
     */
    function suggestItemsForGap(yourTotal, theirTotal) {
        const gap = theirTotal - yourTotal;
        
        if (Math.abs(gap) < 50000) {
            return []; // Gap is small enough
        }
        
        // Generate suggestions based on typical item values
        const suggestions = [];
        const absGap = Math.abs(gap);
        
        if (absGap >= 1000000) {
            suggestions.push({ name: 'Phantom', estimatedValue: 3500000, type: 'vehicle' });
            suggestions.push({ name: 'Carbonara', estimatedValue: 2200000, type: 'vehicle' });
        } else if (absGap >= 500000) {
            suggestions.push({ name: 'Bull', estimatedValue: 800000, type: 'vehicle' });
            suggestions.push({ name: 'Tortoise', estimatedValue: 650000, type: 'vehicle' });
        } else if (absGap >= 200000) {
            suggestions.push({ name: 'Roadster', estimatedValue: 350000, type: 'vehicle' });
            suggestions.push({ name: 'Camaro', estimatedValue: 280000, type: 'vehicle' });
        } else if (absGap >= 50000) {
            suggestions.push({ name: 'Sedan', estimatedValue: 80000, type: 'vehicle' });
            suggestions.push({ name: 'Police Interpol', estimatedValue: 95000, type: 'vehicle' });
        }
        
        return suggestions;
    }

    /**
     * Calculate portfolio diversity score
     */
    function calculateDiversityScore(items) {
        if (items.length === 0) return 0;
        
        const types = {};
        items.forEach(item => {
            const type = item.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });
        
        const typeCount = Object.keys(types).length;
        const maxTypes = 5; // Ideal max diversity
        
        // Score based on variety of item types
        const varietyScore = Math.min(typeCount / maxTypes, 1) * 50;
        
        // Score based on item count (diminishing returns)
        const countScore = Math.min(Math.log(items.length + 1) / Math.log(10), 1) * 50;
        
        return Math.round(varietyScore + countScore);
    }

    // ========================================
    // Trade History Module
    // ========================================
    
    const TradeHistory = {
        STORAGE_KEY: 'jbx_trade_history',
        MAX_HISTORY: 50,
        
        /**
         * Save trade to history
         */
        save(trade) {
            try {
                const history = this.getAll();
                trade.timestamp = Date.now();
                history.unshift(trade);
                
                // Limit history size
                if (history.length > this.MAX_HISTORY) {
                    history.splice(this.MAX_HISTORY);
                }
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
                return true;
            } catch (error) {
                console.error('Error saving trade history:', error);
                return false;
            }
        },
        
        /**
         * Get all trade history
         */
        getAll() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch {
                return [];
            }
        },
        
        /**
         * Clear history
         */
        clear() {
            localStorage.removeItem(this.STORAGE_KEY);
        },
        
        /**
         * Delete specific trade
         */
        delete(index) {
            const history = this.getAll();
            history.splice(index, 1);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        }
    };

    // ========================================
    // Favorite Items Module
    // ========================================
    
    const Favorites = {
        STORAGE_KEY: 'jbx_favorites',
        
        /**
         * Add item to favorites
         */
        add(item) {
            try {
                const favorites = this.getAll();
                const exists = favorites.some(f => f.name.toLowerCase() === item.name.toLowerCase());
                
                if (!exists) {
                    favorites.push({
                        name: item.name,
                        type: item.type,
                        cashValue: item.cash_value,
                        dupedValue: item.duped_value,
                        addedAt: Date.now()
                    });
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error saving favorite:', error);
                return false;
            }
        },
        
        /**
         * Remove item from favorites
         */
        remove(itemName) {
            try {
                let favorites = this.getAll();
                favorites = favorites.filter(f => f.name.toLowerCase() !== itemName.toLowerCase());
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
                return true;
            } catch {
                return false;
            }
        },
        
        /**
         * Get all favorites
         */
        getAll() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch {
                return [];
            }
        },
        
        /**
         * Check if item is favorited
         */
        isFavorited(itemName) {
            return this.getAll().some(f => f.name.toLowerCase() === itemName.toLowerCase());
        }
    };

    // ========================================
    // Notification Preferences
    // ========================================
    
    const Notifications = {
        STORAGE_KEY: 'jbx_notification_prefs',
        
        prefs: {
            priceAlerts: true,
            trendUpdates: false,
            dupeWarnings: true
        },
        
        /**
         * Load preferences
         */
        load() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                if (data) {
                    this.prefs = { ...this.prefs, ...JSON.parse(data) };
                }
            } catch {}
            return this.prefs;
        },
        
        /**
         * Save preferences
         */
        save(prefs) {
            this.prefs = { ...this.prefs, ...prefs };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.prefs));
        },
        
        /**
         * Request browser notification permission
         */
        async requestPermission() {
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
        },
        
        /**
         * Show browser notification
         */
        show(title, body) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="65" text-anchor="middle" font-size="50" fill="%236366f1">◆</text></svg>' });
            }
        }
    };

    // ========================================
    // Price Watch Module
    // ========================================
    
    const PriceWatch = {
        STORAGE_KEY: 'jbx_price_watch',
        
        /**
         * Add item to price watch
         */
        add(itemName) {
            try {
                const watched = this.getAll();
                if (!watched.includes(itemName.toLowerCase())) {
                    watched.push(itemName.toLowerCase());
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(watched));
                    return true;
                }
                return false;
            } catch {
                return false;
            }
        },
        
        /**
         * Remove item from price watch
         */
        remove(itemName) {
            try {
                let watched = this.getAll();
                watched = watched.filter(n => n !== itemName.toLowerCase());
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(watched));
                return true;
            } catch {
                return false;
            }
        },
        
        /**
         * Get all watched items
         */
        getAll() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch {
                return [];
            }
        },
        
        /**
         * Check if item is being watched
         */
        isWatched(itemName) {
            return this.getAll().includes(itemName.toLowerCase());
        }
    };

    // ========================================
    // Export enhanced modules
    // ========================================
    
    window.JBXEnhanced = {
        analyzeTradeFairness,
        suggestItemsForGap,
        calculateDiversityScore,
        fetchTrendingItems,
        TradeHistory,
        Favorites,
        Notifications,
        PriceWatch
    };

    console.log('JB-X Enhanced Features loaded!');
})();