// Travis data container — GET returns all stored data, POST stores new data
// Reads from Supabase travis_data table if available, falls back to in-memory

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory fallback store (persists within a single serverless instance)
let memoryStore = {
  member_count: null,
  monthly_revenue: null,
  production_clients: null,
  open_invoices: null,
  open_loops: null,
  last_updated: null
};

async function supabaseGet() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/travis_data?select=*&order=last_updated.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0] : null;
  } catch (e) {
    console.log('Supabase GET failed:', e.message);
    return null;
  }
}

async function supabaseUpsert(data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/travis_data`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
      }
    );
    return res.ok;
  } catch (e) {
    console.log('Supabase UPSERT failed:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  // ── GET — return all stored Travis data ──
  if (req.method === 'GET') {
    // Try Supabase first
    const dbData = await supabaseGet();
    const source = dbData || memoryStore;

    const monthly_revenue = source.monthly_revenue != null ? Number(source.monthly_revenue) : null;

    return res.status(200).json({
      member_count: source.member_count ?? null,
      monthly_revenue: monthly_revenue,
      gap_to_goal: monthly_revenue != null ? 8000 - monthly_revenue : null,
      production_clients: source.production_clients ?? null,
      open_invoices: source.open_invoices ?? null,
      open_loops: source.open_loops ?? null,
      last_updated: source.last_updated ?? null
    });
  }

  // ── POST — store/update Travis data (existing behavior preserved) ──
  if (req.method === 'POST') {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const now = new Date().toISOString();
    const update = {
      member_count: body.member_count ?? memoryStore.member_count,
      monthly_revenue: body.monthly_revenue ?? memoryStore.monthly_revenue,
      production_clients: body.production_clients ?? memoryStore.production_clients,
      open_invoices: body.open_invoices ?? memoryStore.open_invoices,
      open_loops: body.open_loops ?? memoryStore.open_loops,
      last_updated: now
    };

    // Update in-memory store
    memoryStore = { ...update };

    // Try to persist to Supabase
    await supabaseUpsert(update);

    return res.status(200).json({ success: true, ...update });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
