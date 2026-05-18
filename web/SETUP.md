# JBCL Web Interface - Setup Guide

## Quick Start (Your Domain)

Since you control `ches.dev` via Cloudflare, here's how to get the API working:

### Step 1: Deploy Cloudflare Worker

Go to **Cloudflare Dashboard > Workers & Pages > Create Worker** and paste this code:

```javascript
/**
 * JBCL API Proxy - Cloudflare Worker
 */

const API_BASE = 'https://api.jailbreakchangelogs.xyz';
const INV_BASE = 'https://inventories.jailbreakchangelogs.xyz';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    try {
      // Item search: /items?name=phantom
      if (path === '/items') {
        const itemName = url.searchParams.get('name');
        if (!itemName) return json({ error: 'Missing name' }, 400);
        
        const response = await fetch(`${API_BASE}/items/get?name=${encodeURIComponent(itemName)}`);
        const data = await response.json();
        return json(data);
      }
      
      // User lookup: POST /users {usernames: ["name"]}
      if (path === '/users') {
        const body = await request.json();
        const usernames = body.usernames || [];
        
        const response = await fetch(`${INV_BASE}/proxy/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames, excludeBannedUser: true }),
        });
        
        const data = await response.json();
        return json(data);
      }
      
      // Dupe check: /dupes?id=userid
      if (path === '/dupes') {
        const userId = url.searchParams.get('id');
        if (!userId) return json({ error: 'Missing id' }, 400);
        
        const response = await fetch(`${INV_BASE}/users/dupes?id=${userId}`);
        
        if (response.status === 404) {
          return json({ data: [], message: 'No dupes found' });
        }
        
        const data = await response.json();
        return json(data);
      }
      
      // Inventory: /inventory?id=userid
      if (path === '/inventory') {
        const userId = url.searchParams.get('id');
        if (!userId) return json({ error: 'Missing id' }, 400);
        
        const response = await fetch(`${INV_BASE}/users/inventory?id=${userId}`);
        const data = await response.json();
        return json(data);
      }
      
      // Health check
      if (path === '/health') {
        return json({ status: 'ok', timestamp: Date.now() });
      }
      
      return json({ error: 'Not found' }, 404);
      
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### Step 2: Configure Routes

In the Worker settings, add a **Route**:
- Pattern: `ches.dev/api/*`
- Handler: `fetch`

### Step 3: Deploy the Web Files

Upload the contents of the `web/` folder to your site (via Cloudflare Pages or Workers static files).

---

## API Endpoints Available

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/items?name=X` | GET | Search items | `/items?name=phantom` |
| `/users` | POST | Get user IDs | `{usernames: ["name"]}` |
| `/dupes?id=X` | GET | Check dupes | `/dupes?id=123456` |
| `/inventory?id=X` | GET | Get inventory | `/inventory?id=123456` |
| `/health` | GET | Health check | `/health` |

---

## Features

- ✅ **Item Lookup** - Search any Jailbreak item
- ✅ **Trade Calculator** - Compare trade values
- ✅ **Dupe Check** - Check if user has duped items
- ✅ **Inventory** - View user inventory (basic)
- ✅ **Favorites** - Save items (localStorage)
- ✅ **Dark/Light Theme** - Toggle in header