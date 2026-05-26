const STYLES = {
  online: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  offline: 'bg-red-100 text-red-800 ring-red-600/20',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const LABELS = {
  online: 'Online',
  offline: 'Offline',
  unknown: 'Sem dados',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${STYLES[status] || STYLES.unknown}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'online' ? 'bg-emerald-500 animate-pulse' : status === 'offline' ? 'bg-red-500' : 'bg-slate-400'
        }`}
      />
      {LABELS[status] || LABELS.unknown}
    </span>
  );
}
