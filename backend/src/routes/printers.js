import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as store from '../services/printerStore.js';
import * as snmp from '../services/snmpService.js';

const router = Router();

const REQUIRED_FIELDS = ['name', 'model', 'ip', 'location', 'type'];

function validatePrinter(body, isUpdate = false) {
  const errors = [];
  if (!isUpdate) {
    for (const field of REQUIRED_FIELDS) {
      if (!body[field]?.trim?.() && body[field] !== 0) {
        errors.push(`Campo obrigatório: ${field}`);
      }
    }
  }
  if (body.type && !['monochrome', 'color'].includes(body.type)) {
    errors.push('Tipo deve ser "monochrome" ou "color"');
  }
  if (body.ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(body.ip)) {
    errors.push('IP inválido');
  }
  return errors;
}

router.get('/', async (_req, res) => {
  try {
    const printers = await store.getAllPrinters();
    res.json(printers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const printer = await store.getPrinterById(req.params.id);
    if (!printer) return res.status(404).json({ error: 'Impressora não encontrada' });
    res.json(printer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validatePrinter(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const printer = {
      id: uuidv4(),
      name: req.body.name.trim(),
      model: req.body.model.trim(),
      ip: req.body.ip.trim(),
      location: req.body.location.trim(),
      type: req.body.type,
      snmpCommunity: req.body.snmpCommunity || null,
      createdAt: new Date().toISOString(),
      lastStatus: null,
      lastSupplies: null,
    };

    await store.addPrinter(printer);
    res.status(201).json(printer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validatePrinter(req.body, true);
    if (errors.length) return res.status(400).json({ errors });

    const updates = {};
    for (const field of [...REQUIRED_FIELDS, 'snmpCommunity']) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    }
    updates.updatedAt = new Date().toISOString();

    const printer = await store.updatePrinter(req.params.id, updates);
    if (!printer) return res.status(404).json({ error: 'Impressora não encontrada' });
    res.json(printer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await store.deletePrinter(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Impressora não encontrada' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/status', async (req, res) => {
  try {
    const printer = await store.getPrinterById(req.params.id);
    if (!printer) return res.status(404).json({ error: 'Impressora não encontrada' });

    if (printer.snmpCommunity) {
      const prev = process.env.SNMP_COMMUNITY;
      process.env.SNMP_COMMUNITY = printer.snmpCommunity;
      const status = await snmp.fetchPrinterStatus(printer.ip);
      if (prev !== undefined) process.env.SNMP_COMMUNITY = prev;
      else delete process.env.SNMP_COMMUNITY;

      await store.updatePrinter(printer.id, { lastStatus: status });
      return res.json({ printerId: printer.id, ...status });
    }

    const status = await snmp.fetchPrinterStatus(printer.ip);
    await store.updatePrinter(printer.id, { lastStatus: status });
    res.json({ printerId: printer.id, ...status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/supplies', async (req, res) => {
  try {
    const printer = await store.getPrinterById(req.params.id);
    if (!printer) return res.status(404).json({ error: 'Impressora não encontrada' });

    if (printer.snmpCommunity) {
      const prev = process.env.SNMP_COMMUNITY;
      process.env.SNMP_COMMUNITY = printer.snmpCommunity;
      const data = await snmp.fetchSupplies(printer.ip);
      if (prev !== undefined) process.env.SNMP_COMMUNITY = prev;
      else delete process.env.SNMP_COMMUNITY;

      await store.updatePrinter(printer.id, { lastSupplies: data });
      return res.json({ printerId: printer.id, ...data });
    }

    const data = await snmp.fetchSupplies(printer.ip);
    await store.updatePrinter(printer.id, { lastSupplies: data });
    res.json({ printerId: printer.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const printer = await store.getPrinterById(req.params.id);
    if (!printer) return res.status(404).json({ error: 'Impressora não encontrada' });

    const result = await snmp.testConnection(printer.ip);
    res.json({ printerId: printer.id, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/refresh', async (req, res) => {
  try {
    const printer = await store.getPrinterById(req.params.id);
    if (!printer) return res.status(404).json({ error: 'Impressora não encontrada' });

    const data = await snmp.fetchFullData(printer.ip);
    await store.updatePrinter(printer.id, {
      lastStatus: {
        online: data.online,
        deviceName: data.deviceName,
        systemDescription: data.systemDescription,
        lastChecked: data.lastChecked,
        error: data.error,
      },
      lastSupplies: data,
    });

    res.json({ printerId: printer.id, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
