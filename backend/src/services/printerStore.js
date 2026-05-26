import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../../data/printers.json');

async function ensureFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

export async function getAllPrinters() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

export async function savePrinters(printers) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(printers, null, 2), 'utf-8');
}

export async function getPrinterById(id) {
  const printers = await getAllPrinters();
  return printers.find((p) => p.id === id) ?? null;
}

export async function addPrinter(printer) {
  const printers = await getAllPrinters();
  printers.push(printer);
  await savePrinters(printers);
  return printer;
}

export async function updatePrinter(id, updates) {
  const printers = await getAllPrinters();
  const index = printers.findIndex((p) => p.id === id);
  if (index === -1) return null;
  printers[index] = { ...printers[index], ...updates, id };
  await savePrinters(printers);
  return printers[index];
}

export async function deletePrinter(id) {
  const printers = await getAllPrinters();
  const filtered = printers.filter((p) => p.id !== id);
  if (filtered.length === printers.length) return false;
  await savePrinters(filtered);
  return true;
}
