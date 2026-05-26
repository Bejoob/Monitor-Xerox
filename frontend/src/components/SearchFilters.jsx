export default function SearchFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  locationFilter,
  onLocationChange,
  locations,
}) {
  const safeLocations = Array.isArray(locations) ? locations : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          placeholder="Buscar por nome, IP, modelo ou local..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none transition"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none min-w-[140px]"
      >
        <option value="all">Todos os status</option>
        <option value="below_10">Abaixo de 10%</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
        <option value="unknown">Sem dados</option>
      </select>
      <select
        value={locationFilter}
        onChange={(e) => onLocationChange(e.target.value)}
        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none min-w-[160px]"
      >
        <option value="all">Todas as unidades</option>
        {safeLocations.map((loc) => (
          <option key={loc} value={loc}>{loc}</option>
        ))}
      </select>
    </div>
  );
}
