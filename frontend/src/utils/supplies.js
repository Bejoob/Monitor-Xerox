export const SUPPLY_LABELS = {
  blackToner: 'Toner Preto',
  cyanToner: 'Toner Ciano',
  magentaToner: 'Toner Magenta',
  yellowToner: 'Toner Amarelo',
  fuser: 'Fusor',
  drum: 'Cilindro',
  transferUnit: 'Unidade de Transferência',
  wasteToner: 'Resíduo de Toner',
};

/** Cores CMYK para barras e percentuais dos toners */
export const TONER_COLORS = {
  blackToner: { bar: 'bg-neutral-900', text: 'text-neutral-900' },
  cyanToner: { bar: 'bg-cyan-500', text: 'text-cyan-600' },
  magentaToner: { bar: 'bg-fuchsia-500', text: 'text-fuchsia-600' },
  yellowToner: { bar: 'bg-yellow-400', text: 'text-yellow-700' },
};

export const ALERT_COLORS = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
  unavailable: 'bg-slate-300',
};

export const ALERT_TEXT = {
  green: 'text-emerald-700',
  yellow: 'text-amber-700',
  red: 'text-red-700',
  unavailable: 'text-slate-500',
};

export const ALERT_BG_LIGHT = {
  green: 'bg-emerald-50 border-emerald-200',
  yellow: 'bg-amber-50 border-amber-200',
  red: 'bg-red-50 border-red-200',
  unavailable: 'bg-slate-50 border-slate-200',
};

export function getOnlineStatus(printer) {
  const status = printer.lastStatus || printer.lastSupplies;
  if (!status) return 'unknown';
  return status.online ? 'online' : 'offline';
}

export function hasSupplyBelow10(printer) {
  const supplies = printer.lastSupplies?.supplies;
  if (!supplies) return false;

  return Object.values(supplies).some(
    (item) => item?.available && item.percentage != null && item.percentage < 10
  );
}

export function getWorstAlert(printer) {
  const supplies = printer.lastSupplies?.supplies;
  if (!supplies) return 'unavailable';

  const order = { red: 3, yellow: 2, green: 1, unavailable: 0 };
  let worst = 'unavailable';

  for (const item of Object.values(supplies)) {
    if (!item?.alertLevel) continue;
    if ((order[item.alertLevel] ?? 0) > (order[worst] ?? 0)) {
      worst = item.alertLevel;
    }
  }
  return worst;
}

export function filterPrinters(printers, { search, statusFilter, locationFilter }) {
  return printers.filter((p) => {
    const q = search.toLowerCase().trim();
    if (q) {
      const haystack = [p.name, p.model, p.ip, p.location].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'below_10') {
        if (!hasSupplyBelow10(p)) return false;
      } else {
        const online = getOnlineStatus(p);
        if (statusFilter === 'online' && online !== 'online') return false;
        if (statusFilter === 'offline' && online !== 'offline') return false;
        if (statusFilter === 'unknown' && online !== 'unknown') return false;
      }
    }
    if (locationFilter !== 'all' && p.location !== locationFilter) return false;
    return true;
  });
}
