import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_FILE = path.join(__dirname, '../../data/printers.json');
const VERCEL_TMP_DATA_FILE = '/tmp/printers.json';
const DATA_FILE = process.env.PRINTERS_DATA_FILE
  || (process.env.VERCEL ? VERCEL_TMP_DATA_FILE : DEFAULT_DATA_FILE);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_TABLE = 'printers';

function toObject(value, fallback = {}) {
  return value && typeof value === 'object' ? value : fallback;
}

function normalizePrinter(printer) {
  return {
    id: printer.id,
    name: printer.name,
    model: printer.model,
    ip: printer.ip,
    location: printer.location,
    type: printer.type,
    snmpCommunity: printer.snmpCommunity ?? null,
    createdAt: printer.createdAt ?? null,
    updatedAt: printer.updatedAt ?? null,
    lastStatus: toObject(printer.lastStatus, null),
    lastSupplies: toObject(printer.lastSupplies, null),
  };
}

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body || 'erro na requisição'}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getAllPrintersFromSupabase() {
  const rows = await supabaseRequest(
    `${SUPABASE_TABLE}?select=data&order=created_at.asc`
  );
  return Array.isArray(rows) ? rows.map((row) => normalizePrinter(toObject(row.data))) : [];
}

async function getPrinterByIdFromSupabase(id) {
  const rows = await supabaseRequest(
    `${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}&select=data&limit=1`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return normalizePrinter(toObject(rows[0].data));
}

async function addPrinterToSupabase(printer) {
  const payload = [{ id: printer.id, data: normalizePrinter(printer) }];
  const rows = await supabaseRequest(SUPABASE_TABLE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizePrinter(toObject(rows?.[0]?.data, printer));
}

async function updatePrinterInSupabase(id, updates) {
  const current = await getPrinterByIdFromSupabase(id);
  if (!current) return null;
  const next = normalizePrinter({ ...current, ...updates, id });

  const rows = await supabaseRequest(
    `${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ data: next }),
    }
  );

  return normalizePrinter(toObject(rows?.[0]?.data, next));
}

async function deletePrinterFromSupabase(id) {
  const rows = await supabaseRequest(
    `${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}&select=id`,
    { method: 'DELETE' }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    let initialContent = '[]';

    // On Vercel, app files are read-only. Seed /tmp with bundled data when available.
    if (DATA_FILE !== DEFAULT_DATA_FILE) {
      try {
        initialContent = await fs.readFile(DEFAULT_DATA_FILE, 'utf-8');
      } catch {
        initialContent = '[]';
      }
    }

    await fs.writeFile(DATA_FILE, initialContent, 'utf-8');
  }
}

export async function getAllPrinters() {
  if (USE_SUPABASE) return getAllPrintersFromSupabase();
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function savePrinters(printers) {
  if (USE_SUPABASE) {
    throw new Error('savePrinters não é suportado com Supabase');
  }
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(printers, null, 2), 'utf-8');
}

export async function getPrinterById(id) {
  if (USE_SUPABASE) return getPrinterByIdFromSupabase(id);
  const printers = await getAllPrinters();
  return printers.find((p) => p.id === id) ?? null;
}

export async function addPrinter(printer) {
  if (USE_SUPABASE) return addPrinterToSupabase(printer);
  const printers = await getAllPrinters();
  printers.push(printer);
  await savePrinters(printers);
  return printer;
}

export async function updatePrinter(id, updates) {
  if (USE_SUPABASE) return updatePrinterInSupabase(id, updates);
  const printers = await getAllPrinters();
  const index = printers.findIndex((p) => p.id === id);
  if (index === -1) return null;
  printers[index] = { ...printers[index], ...updates, id };
  await savePrinters(printers);
  return printers[index];
}

export async function deletePrinter(id) {
  if (USE_SUPABASE) return deletePrinterFromSupabase(id);
  const printers = await getAllPrinters();
  const filtered = printers.filter((p) => p.id !== id);
  if (filtered.length === printers.length) return false;
  await savePrinters(filtered);
  return true;
}
