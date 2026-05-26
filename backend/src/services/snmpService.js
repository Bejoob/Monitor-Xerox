import snmp from 'net-snmp';

const OIDS = {
  sysName: '1.3.6.1.2.1.1.5.0',
  sysDescr: '1.3.6.1.2.1.1.1.0',
  suppliesDescription: '1.3.6.1.2.1.43.11.1.1.6',
  suppliesMaxCapacity: '1.3.6.1.2.1.43.11.1.1.8',
  suppliesLevel: '1.3.6.1.2.1.43.11.1.1.9',
  inputDescription: '1.3.6.1.2.1.43.8.2.1.18',
  inputMaxCapacity: '1.3.6.1.2.1.43.8.2.1.9',
  inputCurrentLevel: '1.3.6.1.2.1.43.8.2.1.10',
  /** Coluna proprietária Xerox (0–100); usada quando hrInputCurrentLevel = -3 */
  inputVendorPercent: '1.3.6.1.2.1.43.8.2.1.20',
};

const SUPPLY_CATEGORIES = [
  { key: 'blackToner', labels: ['black', 'preto', 'k toner', 'toner k', 'toner black'] },
  { key: 'cyanToner', labels: ['cyan', 'ciano', 'c toner', 'toner c'] },
  { key: 'magentaToner', labels: ['magenta', 'm toner', 'toner m'] },
  { key: 'yellowToner', labels: ['yellow', 'amarelo', 'y toner', 'toner y'] },
  { key: 'fuser', labels: ['fuser', 'fusor', 'fusing'] },
  { key: 'drum', labels: ['drum', 'cilindro', 'imaging unit', 'photoconductor'] },
  { key: 'transferUnit', labels: ['transfer', 'unidade de transfer', 'belt', 'correia'] },
  { key: 'wasteToner', labels: ['waste', 'resíduo', 'residuo', 'waste toner', 'toner waste'] },
];

function getConfig() {
  return {
    community: process.env.SNMP_COMMUNITY || 'public',
    timeout: parseInt(process.env.SNMP_TIMEOUT || '5000', 10),
  };
}

function createSession(ip) {
  const { community, timeout } = getConfig();
  return snmp.createSession(ip, community, {
    timeout,
    retries: 1,
    version: snmp.Version2c,
  });
}

function walkOid(session, oid) {
  return new Promise((resolve, reject) => {
    const results = [];
    session.subtree(oid, 50, (varbinds) => {
      for (const vb of varbinds) {
        if (snmp.isVarbindError(vb)) continue;
        const suffix = vb.oid.replace(`${oid}.`, '');
        results.push({ index: suffix, value: parseVarbind(vb) });
      }
    }, (error) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

function getOid(session, oid) {
  return new Promise((resolve, reject) => {
    session.get([oid], (error, varbinds) => {
      if (error) return reject(error);
      const vb = varbinds[0];
      if (snmp.isVarbindError(vb)) return reject(new Error(snmp.varbindError(vb)));
      resolve(parseVarbind(vb));
    });
  });
}

function parseVarbind(vb) {
  if (vb.type === snmp.ObjectType.OctetString) {
    return vb.value.toString('utf8').replace(/\0/g, '').trim();
  }
  if (vb.type === snmp.ObjectType.Integer) return vb.value;
  if (vb.type === snmp.ObjectType.Gauge32) return vb.value;
  if (vb.type === snmp.ObjectType.Counter32) return vb.value;
  return vb.value;
}

function mapByIndex(entries) {
  const map = {};
  for (const { index, value } of entries) {
    const baseIndex = index.split('.')[0];
    if (!map[baseIndex]) map[baseIndex] = {};
    map[baseIndex][index] = value;
  }
  return map;
}

function groupTableRows(descriptions, maxCapacities, levels) {
  const descMap = {};
  for (const { index, value } of descriptions) {
    const rowKey = index.split('.').slice(0, -1).join('.') || index.split('.')[0];
    const parts = index.split('.');
    const rowIndex = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
    descMap[index] = { rowIndex: index, description: value };
  }

  const rows = {};
  for (const { index, value } of descriptions) {
    rows[index] = { description: value, level: null, maxCapacity: null };
  }
  for (const { index, value } of maxCapacities) {
    const descKey = findMatchingKey(rows, index);
    if (descKey) rows[descKey].maxCapacity = value;
    else rows[index] = { ...(rows[index] || {}), maxCapacity: value };
  }
  for (const { index, value } of levels) {
    const descKey = findMatchingKey(rows, index);
    if (descKey) rows[descKey].level = value;
    else rows[index] = { ...(rows[index] || {}), level: value };
  }

  return Object.entries(rows).map(([idx, row]) => ({
    index: idx,
    description: row.description || 'Desconhecido',
    level: row.level,
    maxCapacity: row.maxCapacity,
    ...calculatePercentage(row.level, row.maxCapacity),
  }));
}

function findMatchingKey(rows, levelIndex) {
  const levelParts = levelIndex.split('.');
  const base = levelParts.slice(0, -1).join('.');
  for (const key of Object.keys(rows)) {
    if (key.startsWith(base) || levelIndex.startsWith(key.split('.').slice(0, -1).join('.'))) {
      return key;
    }
    const keyBase = key.split('.').slice(0, -1).join('.');
    if (base === keyBase || key === levelIndex) return key;
  }
  const simpleIndex = levelParts[0];
  for (const key of Object.keys(rows)) {
    if (key.split('.')[0] === simpleIndex) return key;
  }
  return null;
}

function toSnmpInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return parseInt(value.trim(), 10);
  }
  return null;
}

function percentageFromValue(percentage) {
  const p = Math.min(100, Math.max(0, percentage));
  let alertLevel = 'green';
  if (p <= 20) alertLevel = 'red';
  else if (p <= 50) alertLevel = 'yellow';
  return {
    percentage: Math.round(p * 10) / 10,
    display: `${Math.round(p)}%`,
    alertLevel,
    available: true,
  };
}

function formatTrayQuantity(pct) {
  if (!pct?.available) return 'Não informado pelo equipamento';
  if (typeof pct.percentage === 'number' && Number.isFinite(pct.percentage)) {
    return `${Math.round(pct.percentage)}%`;
  }
  if (pct.display && !String(pct.display).includes('NaN')) return pct.display;
  return 'Não informado pelo equipamento';
}

function resolveTrayPercentage(currentLevel, maxCapacity, vendorPercent) {
  const level = toSnmpInt(currentLevel);
  const max = toSnmpInt(maxCapacity);
  const vendor = toSnmpInt(vendorPercent);

  if (level === 0) return percentageFromValue(0);

  const standard = calculatePercentage(level, max);
  if (standard.available) return standard;

  if (level === -3 && vendor != null && vendor >= 0 && vendor <= 100) {
    return percentageFromValue(vendor);
  }

  return standard;
}

function isTrayRowValid(currentLevel, maxCapacity) {
  const max = toSnmpInt(maxCapacity);
  if (max != null && max > 0) return true;
  const level = toSnmpInt(currentLevel);
  if (level != null && level >= -3) return true;
  return false;
}

function groupInputRows(descriptions, maxCapacities, levels, vendorPercents = []) {
  const maxByIndex = new Map(maxCapacities.map(({ index, value }) => [index, value]));
  const levelByIndex = new Map(levels.map(({ index, value }) => [index, value]));
  const vendorByIndex = new Map(vendorPercents.map(({ index, value }) => [index, value]));
  const descByIndex = new Map(descriptions.map(({ index, value }) => [index, value]));

  const indices = new Set([
    ...descByIndex.keys(),
    ...maxByIndex.keys(),
    ...levelByIndex.keys(),
  ]);

  return [...indices]
    .filter((index) => isTrayRowValid(levelByIndex.get(index), maxByIndex.get(index)))
    .map((index) => {
      const description = descByIndex.get(index);
      const currentLevel = levelByIndex.get(index);
      const maxCapacity = maxByIndex.get(index);
      const vendorPercent = vendorByIndex.get(index);
      const pct = resolveTrayPercentage(currentLevel, maxCapacity, vendorPercent);

      return {
        name: description || `Bandeja ${index}`,
        status: interpretTrayStatus(currentLevel, maxCapacity, vendorPercent),
        quantity: formatTrayQuantity(pct),
        paperType: extractPaperType(description || ''),
        level: toSnmpInt(currentLevel) ?? currentLevel,
        maxCapacity: toSnmpInt(maxCapacity) ?? maxCapacity,
        percentage: pct.percentage,
        alertLevel: pct.alertLevel,
        available: pct.available,
      };
    });
}

function extractPaperType(description) {
  const lower = (description || '').toLowerCase();
  const sizes = ['a3', 'a4', 'a5', 'letter', 'legal', 'tabloid'];
  const found = sizes.find((s) => lower.includes(s));
  return found ? found.toUpperCase() : (description ? description : 'Não informado pelo equipamento');
}

function interpretTrayStatus(level, max, vendorPercent) {
  const levelNum = toSnmpInt(level);
  if (levelNum === -3) {
    const pct = resolveTrayPercentage(level, max, vendorPercent);
    if (pct.available) {
      if (pct.percentage > 50) return 'OK';
      if (pct.percentage > 20) return 'Baixo';
      return 'Crítico';
    }
    return 'Indisponível';
  }
  if (levelNum === -2) return 'Indisponível';
  if (levelNum === -1) return 'Desconhecido';
  if (levelNum === 0) return 'Vazio';
  const pct = resolveTrayPercentage(level, max, vendorPercent);
  if (!pct.available) return 'Não informado';
  if (pct.percentage > 50) return 'OK';
  if (pct.percentage > 20) return 'Baixo';
  return 'Crítico';
}

export function calculatePercentage(level, maxCapacity) {
  const invalidLevels = [-1, -2, -3];
  const levelNum = toSnmpInt(level);
  const maxNum = toSnmpInt(maxCapacity);

  if (
    levelNum === null ||
    maxNum === null ||
    invalidLevels.includes(levelNum) ||
    invalidLevels.includes(maxNum) ||
    maxNum <= 0
  ) {
    return {
      percentage: null,
      display: 'Não informado pelo equipamento',
      alertLevel: 'unavailable',
      available: false,
    };
  }

  const percentage = Math.min(100, Math.max(0, (levelNum / maxNum) * 100));
  let alertLevel = 'green';
  if (percentage <= 20) alertLevel = 'red';
  else if (percentage <= 50) alertLevel = 'yellow';

  return {
    percentage: Math.round(percentage * 10) / 10,
    display: `${Math.round(percentage)}%`,
    alertLevel,
    available: true,
  };
}

function categorizeSupply(description) {
  const lower = (description || '').toLowerCase();
  for (const cat of SUPPLY_CATEGORIES) {
    if (cat.labels.some((label) => lower.includes(label))) {
      return cat.key;
    }
  }
  return null;
}

function buildCategorizedSupplies(supplyRows) {
  const template = {
    blackToner: null,
    cyanToner: null,
    magentaToner: null,
    yellowToner: null,
    fuser: null,
    drum: null,
    transferUnit: null,
    wasteToner: null,
  };

  const uncategorized = [];

  for (const row of supplyRows) {
    const category = categorizeSupply(row.description);
    const item = {
      name: row.description,
      level: row.level,
      maxCapacity: row.maxCapacity,
      percentage: row.percentage,
      display: row.display,
      alertLevel: row.alertLevel,
      available: row.available,
    };

    if (category && !template[category]) {
      template[category] = item;
    } else if (category && template[category]) {
      uncategorized.push(item);
    } else {
      uncategorized.push(item);
    }
  }

  const result = {};
  for (const [key, value] of Object.entries(template)) {
    result[key] = value ?? {
      name: getDefaultName(key),
      display: 'Não informado pelo equipamento',
      percentage: null,
      alertLevel: 'unavailable',
      available: false,
    };
  }

  return { supplies: result, other: uncategorized };
}

function getDefaultName(key) {
  const names = {
    blackToner: 'Toner Preto',
    cyanToner: 'Toner Ciano',
    magentaToner: 'Toner Magenta',
    yellowToner: 'Toner Amarelo',
    fuser: 'Fusor',
    drum: 'Cilindro',
    transferUnit: 'Unidade de Transferência',
    wasteToner: 'Resíduo de Toner',
  };
  return names[key] || key;
}

function classifyError(error) {
  const msg = (error?.message || String(error)).toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { code: 'TIMEOUT', message: 'Timeout na conexão SNMP' };
  }
  if (msg.includes('request timed out')) {
    return { code: 'TIMEOUT', message: 'Timeout na conexão SNMP' };
  }
  if (msg.includes('econnrefused') || msg.includes('host unreachable') || msg.includes('no response')) {
    return { code: 'UNREACHABLE', message: 'IP inacessível ou impressora offline' };
  }
  if (msg.includes('community') || msg.includes('authorization') || msg.includes('auth')) {
    return { code: 'COMMUNITY', message: 'Community SNMP incorreta' };
  }
  if (msg.includes('not supported') || msg.includes('no such')) {
    return { code: 'OID_UNSUPPORTED', message: 'Equipamento sem suporte para determinado OID' };
  }
  return { code: 'SNMP_ERROR', message: error?.message || 'Erro SNMP desconhecido' };
}

export async function testConnection(ip) {
  const session = createSession(ip);
  try {
    const name = await getOid(session, OIDS.sysName);
    return { success: true, online: true, deviceName: name };
  } catch (error) {
    return { success: false, online: false, ...classifyError(error) };
  } finally {
    session.close();
  }
}

export async function fetchPrinterStatus(ip) {
  const session = createSession(ip);
  try {
    const [sysName, sysDescr] = await Promise.all([
      getOid(session, OIDS.sysName).catch(() => null),
      getOid(session, OIDS.sysDescr).catch(() => null),
    ]);

    return {
      online: true,
      deviceName: sysName || 'Não informado',
      systemDescription: sysDescr || 'Não informado',
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    const err = classifyError(error);
    return {
      online: false,
      deviceName: null,
      systemDescription: null,
      lastChecked: new Date().toISOString(),
      error: err,
    };
  } finally {
    session.close();
  }
}

export async function fetchSupplies(ip) {
  const session = createSession(ip);
  try {
    const [descriptions, maxCapacities, levels, inputDesc, inputMax, inputLevel, inputVendor] =
      await Promise.all([
        walkOid(session, OIDS.suppliesDescription).catch(() => []),
        walkOid(session, OIDS.suppliesMaxCapacity).catch(() => []),
        walkOid(session, OIDS.suppliesLevel).catch(() => []),
        walkOid(session, OIDS.inputDescription).catch(() => []),
        walkOid(session, OIDS.inputMaxCapacity).catch(() => []),
        walkOid(session, OIDS.inputCurrentLevel).catch(() => []),
        walkOid(session, OIDS.inputVendorPercent).catch(() => []),
      ]);

    const supplyRows = alignSupplyTable(descriptions, maxCapacities, levels);
    const { supplies, other } = buildCategorizedSupplies(supplyRows);
    const trays = groupInputRows(inputDesc, inputMax, inputLevel, inputVendor);

    return {
      online: true,
      supplies,
      otherSupplies: other,
      trays: trays.length > 0 ? trays : [],
      rawSupplyCount: supplyRows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const err = classifyError(error);
    return {
      online: false,
      supplies: null,
      trays: [],
      error: err,
      lastUpdated: new Date().toISOString(),
    };
  } finally {
    session.close();
  }
}

function alignSupplyTable(descriptions, maxCapacities, levels) {
  const rows = new Map();

  const getRowKey = (index) => {
    const parts = index.split('.');
    if (parts.length >= 2) return parts.slice(0, -1).join('.');
    return parts[0];
  };

  for (const { index, value } of descriptions) {
    const key = index;
    rows.set(key, { description: value, level: null, maxCapacity: null });
  }

  const levelByRow = new Map();
  for (const { index, value } of levels) {
    levelByRow.set(index, value);
  }
  const maxByRow = new Map();
  for (const { index, value } of maxCapacities) {
    maxByRow.set(index, value);
  }

  const descKeys = [...rows.keys()];
  for (const descKey of descKeys) {
    const suffix = descKey.split('.').pop();
    let level = null;
    let maxCapacity = null;

    for (const [idx, val] of levelByRow) {
      if (idx === descKey || idx.endsWith(`.${suffix}`) || idx.split('.').pop() === suffix) {
        level = val;
        break;
      }
    }
    for (const [idx, val] of maxByRow) {
      if (idx === descKey || idx.endsWith(`.${suffix}`) || idx.split('.').pop() === suffix) {
        maxCapacity = val;
        break;
      }
    }

    const row = rows.get(descKey);
    row.level = level;
    row.maxCapacity = maxCapacity;
    Object.assign(row, calculatePercentage(level, maxCapacity));
  }

  return [...rows.values()].map((row) => ({
    description: row.description,
    level: row.level,
    maxCapacity: row.maxCapacity,
    percentage: row.percentage,
    display: row.display,
    alertLevel: row.alertLevel,
    available: row.available,
  }));
}

export async function fetchFullData(ip) {
  const [status, suppliesData] = await Promise.all([
    fetchPrinterStatus(ip),
    fetchSupplies(ip),
  ]);

  return {
    ...status,
    ...suppliesData,
    online: status.online && suppliesData.online !== false,
  };
}
