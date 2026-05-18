/**
 * JBCL API Proxy - Cloudflare Worker
 * 
 * Deploy this as a Cloudflare Worker at ches.dev/api/proxy
 * This bypasses CORS by running on your domain
 */

// API endpoints
const API_BASE = 'https://api.jailbreakchangelogs.xyz';
const INV_BASE = 'https://inventories.jailbreakchangelogs.xyz';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle CORS preflight
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
      let response;
      
      // Item search: /api/items?name=phantom
      if (path.startsWith('/items')) {
        const itemName = url.searchParams.get('name') || url.searchParams.get('q');
        if (!itemName) {
          return json({ error: 'Missing name parameter' }, 400);
        }
        response = await fetch(`${API_BASE}/items/get?name=${encodeURIComponent(itemName)}`);
        const data = await response.json();
        return json(data);
      }
      
      // User lookup: POST /api/users {usernames: ["name"]}
      if (path.startsWith('/users')) {
        const body = await request.json();
        const usernames = body.usernames || [];
        response = await fetch(`${INV_BASE}/proxy/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames, excludeBannedUser: true }),
        });
        const data = await response.json();
        return json(data);
      }
      
      // Dupe check: /api/dupes?id=userid
      if (path.startsWith('/dupes')) {
        const userId = url.searchParams.get('id');
        if (!userId) {
          return json({ error: 'Missing id parameter' }, 400);
        }
        response = await fetch(`${INV_BASE}/users/dupes?id=${userId}`);
        
        if (response.status === 404) {
          return json({ data: [], message: 'No dupes found' });
        }
        
        const data = await response.json();
        return json(data);
      }
      
      // Inventory: /api/inventory?id=userid
      if (path.startsWith('/inventory')) {
        const userId = url.searchParams.get('id');
        if (!userId) {
          return json({ error: 'Missing id parameter' }, 400);
        }
        response = await fetch(`${INV_BASE}/users/inventory?id=${userId}`);
        const data = await response.json();
        return json(data);
      }
      
      // User search: /api/userlookup?name=username
      if (path.startsWith('/userlookup')) {
        const username = url.searchParams.get('name');
        if (!username) {
          return json({ error: 'Missing name parameter' }, 400);
        }
        response = await fetch(`${INV_BASE}/proxy/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [username], excludeBannedUser: true }),
        });
        const data = await response.json();
        return json(data);
      }
      
      // Health check
      if (path === '/health' || path === '/') {
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

export const config = {
  route: { path: '/api/*', methods: ['GET', 'POST', 'OPTIONS'] },
};