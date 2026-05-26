/**
 * Atualiza lastSupplies/lastStatus de todas as impressoras via SNMP.
 * Uso: node scripts/refresh-all-printers.js
 */
import 'dotenv/config';
import * as store from '../src/services/printerStore.js';
import * as snmp from '../src/services/snmpService.js';

const printers = await store.getAllPrinters();
console.log(`Atualizando ${printers.length} impressora(s)...\n`);

for (const printer of printers) {
  process.stdout.write(`${printer.name} (${printer.ip})... `);
  try {
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
    const trays = data.trays?.map((t) => `${t.name}: ${t.quantity}`).join(', ') || 'sem bandejas';
    console.log(`OK — ${trays}`);
  } catch (err) {
    console.log(`ERRO — ${err.message}`);
  }
}

console.log('\nConcluído.');
