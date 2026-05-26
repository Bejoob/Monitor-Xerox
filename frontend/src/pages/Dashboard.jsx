import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import Layout from '../components/Layout';
import SearchFilters from '../components/SearchFilters';
import PrinterCard from '../components/PrinterCard';
import { filterPrinters, getOnlineStatus } from '../utils/supplies';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function Dashboard() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const loadPrinters = useCallback(async () => {
    try {
      const data = await api.getPrinters();
      setPrinters(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const list = await api.getPrinters().catch(() => []);
    for (const p of list) {
      try {
        await api.refreshPrinter(p.id);
      } catch {
        /* individual failures are ok */
      }
    }
    await loadPrinters();
  }, [loadPrinters]);

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  useEffect(() => {
    const interval = setInterval(refreshAll, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const locations = useMemo(
    () => [...new Set(printers.map((p) => p.location).filter(Boolean))].sort(),
    [printers]
  );

  const filtered = useMemo(
    () => filterPrinters(printers, { search, statusFilter, locationFilter }),
    [printers, search, statusFilter, locationFilter]
  );

  const stats = useMemo(() => {
    const online = printers.filter((p) => getOnlineStatus(p) === 'online').length;
    const offline = printers.filter((p) => getOnlineStatus(p) === 'offline').length;
    return { total: printers.length, online, offline };
  }, [printers]);

  const handleRefresh = async (id) => {
    setRefreshingId(id);
    setMessage(null);
    try {
      await api.refreshPrinter(id);
      await loadPrinters();
      setMessage({ type: 'success', text: 'Consumíveis atualizados com sucesso' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRefreshingId(null);
    }
  };

  const handleTest = async (id) => {
    setRefreshingId(id);
    setMessage(null);
    try {
      const result = await api.testConnection(id);
      if (result.success) {
        setMessage({ type: 'success', text: `Conexão OK — ${result.deviceName || 'Equipamento respondeu'}` });
      } else {
        setMessage({ type: 'error', text: result.message || 'Falha na conexão' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600 mt-1">Monitoramento de consumíveis das impressoras Xerox na rede</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">Total cadastradas</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-5 shadow-sm border border-emerald-200">
            <p className="text-sm text-emerald-700">Online</p>
            <p className="text-3xl font-bold text-emerald-800 mt-1">{stats.online}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-5 shadow-sm border border-red-200">
            <p className="text-sm text-red-700">Offline</p>
            <p className="text-3xl font-bold text-red-800 mt-1">{stats.offline}</p>
          </div>
        </div>

        <div className="mb-6">
          <SearchFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            locations={locations}
          />
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {filtered.length} impressora{filtered.length !== 1 ? 's' : ''} exibida{filtered.length !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={refreshAll}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-white bg-slate-50 font-medium transition"
          >
            Atualizar todas
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Carregando impressoras...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-600 font-medium">Nenhuma impressora encontrada</p>
            <p className="text-sm text-slate-500 mt-1">Cadastre uma impressora ou ajuste os filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((printer) => (
              <PrinterCard
                key={printer.id}
                printer={printer}
                onRefresh={handleRefresh}
                onTest={handleTest}
                loading={refreshingId === printer.id}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Acima de 50%</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400" /> Entre 20% e 50%</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Abaixo de 20%</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-300" /> Indisponível</span>
        </div>
      </div>
    </Layout>
  );
}
