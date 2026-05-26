import { ALERT_COLORS, ALERT_TEXT, TONER_COLORS } from '../utils/supplies';

export default function SupplyBar({ label, supply, compact = false, supplyKey }) {
  const alert = supply?.alertLevel || 'unavailable';
  const display = supply?.display || 'Não informado pelo equipamento';
  const pct = supply?.available ? supply.percentage : null;
  const tonerStyle = supplyKey && TONER_COLORS[supplyKey];
  const barColor = tonerStyle?.bar || ALERT_COLORS[alert] || ALERT_COLORS.unavailable;
  const textColor = tonerStyle?.text || ALERT_TEXT[alert] || ALERT_TEXT.unavailable;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-24 truncate text-slate-600">{label}</span>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: pct != null ? `${pct}%` : '100%', opacity: pct != null ? 1 : 0.3 }}
          />
        </div>
        <span className={`w-16 text-right font-medium ${textColor}`}>{display}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${alert === 'green' ? 'border-emerald-100 bg-emerald-50/30' : alert === 'yellow' ? 'border-amber-100 bg-amber-50/30' : alert === 'red' ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-slate-800 text-sm">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{display}</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: pct != null ? `${Math.max(pct, 2)}%` : '100%', opacity: pct != null ? 1 : 0.25 }}
        />
      </div>
      {supply?.name && supply.name !== label && (
        <p className="text-xs text-slate-500 mt-1 truncate">{supply.name}</p>
      )}
    </div>
  );
}
