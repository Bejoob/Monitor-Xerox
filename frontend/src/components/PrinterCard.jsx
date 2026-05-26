import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import SupplyBar from './SupplyBar';
import { getOnlineStatus, getWorstAlert, SUPPLY_LABELS, ALERT_BG_LIGHT } from '../utils/supplies';

export default function PrinterCard({ printer, onRefresh, onTest, loading }) {
  const onlineStatus = getOnlineStatus(printer);
  const worstAlert = getWorstAlert(printer);
  const supplies = printer.lastSupplies?.supplies;

  const previewKeys = printer.type === 'color'
    ? ['blackToner', 'cyanToner', 'magentaToner', 'yellowToner']
    : ['blackToner'];

  return (
    <article className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${ALERT_BG_LIGHT[worstAlert] || 'border-slate-200'}`}>
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/impressora/${printer.id}`} className="group">
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-xerox-red transition-colors truncate">
                {printer.name}
              </h3>
            </Link>
            <p className="text-sm text-slate-500 truncate">{printer.model}</p>
          </div>
          <StatusBadge status={onlineStatus} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <span className="text-slate-400">IP</span>
            <p className="font-mono font-medium">{printer.ip}</p>
          </div>
          <div>
            <span className="text-slate-400">Local</span>
            <p className="font-medium truncate">{printer.location}</p>
          </div>
        </div>
        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
          printer.type === 'color' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {printer.type === 'color' ? 'Colorida' : 'Monocromática'}
        </span>
      </div>

      {supplies && (
        <div className="px-5 py-4 space-y-2 bg-slate-50/50">
          {previewKeys.map((key) => (
            <SupplyBar
              key={key}
              supplyKey={key}
              label={SUPPLY_LABELS[key]}
              supply={supplies[key]}
              compact
            />
          ))}
        </div>
      )}

      {!supplies && onlineStatus === 'unknown' && (
        <div className="px-5 py-6 text-center text-sm text-slate-500">
          Clique em atualizar para consultar consumíveis
        </div>
      )}

      <div className="px-5 py-3 bg-white flex gap-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onTest(printer.id)}
          disabled={loading}
          className="flex-1 text-xs py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 font-medium transition"
        >
          Testar
        </button>
        <button
          type="button"
          onClick={() => onRefresh(printer.id)}
          disabled={loading}
          className="flex-1 text-xs py-2 px-3 rounded-lg bg-xerox-red text-white hover:bg-red-700 disabled:opacity-50 font-medium transition"
        >
          {loading ? '...' : 'Atualizar'}
        </button>
        <Link
          to={`/impressora/${printer.id}`}
          className="flex-1 text-xs py-2 px-3 rounded-lg bg-xerox-dark text-white hover:bg-slate-800 text-center font-medium transition"
        >
          Detalhes
        </Link>
      </div>
    </article>
  );
}
