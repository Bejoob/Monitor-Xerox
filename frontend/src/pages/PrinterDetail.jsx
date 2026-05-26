import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import SupplyBar from '../components/SupplyBar';
import { SUPPLY_LABELS, getOnlineStatus } from '../utils/supplies';

const REFRESH_INTERVAL = 5 * 60 * 1000;

const TRAY_ALERT = {
  OK: 'text-emerald-700 bg-emerald-50',
  Baixo: 'text-amber-700 bg-amber-50',
  Crítico: 'text-red-700 bg-red-50',
};

function formatTrayQuantity(tray) {
  if (typeof tray?.percentage === 'number' && Number.isFinite(tray.percentage)) {
    return `${Math.round(tray.percentage)}%`;
  }
  const q = tray?.quantity;
  if (q && !String(q).includes('NaN')) return q;
  return 'Não informado pelo equipamento';
}

export default function PrinterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [printer, setPrinter] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getPrinter(id);
      setPrinter(data);
      setLiveData(data.lastSupplies);
    } catch (err) {
      setPrinter(null);
      setLiveData(null);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const data = await api.refreshPrinter(id);
      setLiveData(data);
      await load();
      setMessage({ type: 'success', text: 'Dados atualizados via SNMP' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRefreshing(false);
    }
  }, [id, load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleTest = async () => {
    setRefreshing(true);
    try {
      const result = await api.testConnection(id);
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.success
          ? `Conexão OK — ${result.deviceName || 'SNMP respondendo'}`
          : result.message || 'Falha na conexão',
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remover esta impressora do monitoramento?')) return;
    try {
      await api.deletePrinter(id);
      navigate('/');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500">Carregando...</div>
      </Layout>
    );
  }

  if (!printer) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-600">Impressora não encontrada</p>
          <Link to="/" className="text-xerox-red hover:underline mt-2 inline-block">Voltar ao dashboard</Link>
        </div>
      </Layout>
    );
  }

  const onlineStatus = liveData?.online != null
    ? (liveData.online ? 'online' : 'offline')
    : getOnlineStatus(printer);
  const supplies = liveData?.supplies || printer.lastSupplies?.supplies;
  const traysSource = liveData?.trays || printer.lastSupplies?.trays;
  const trays = Array.isArray(traysSource) ? traysSource : [];
  const otherSupplies = Array.isArray(liveData?.otherSupplies) ? liveData.otherSupplies : [];
  const deviceName = liveData?.deviceName || printer.lastStatus?.deviceName;
  const error = liveData?.error || printer.lastStatus?.error;

  const supplyKeys = Object.keys(SUPPLY_LABELS);
  const visibleKeys = printer.type === 'color'
    ? supplyKeys
    : supplyKeys.filter((k) => !['cyanToner', 'magentaToner', 'yellowToner'].includes(k));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="text-sm text-slate-500 hover:text-xerox-red mb-4 inline-flex items-center gap-1">
          ← Voltar ao dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-xerox-dark to-xerox-navy text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{printer.name}</h2>
                <p className="text-slate-300 mt-1">{printer.model}</p>
              </div>
              <StatusBadge status={onlineStatus} />
            </div>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <InfoItem label="IP" value={printer.ip} mono />
              <InfoItem label="Localização" value={printer.location} />
              <InfoItem label="Equipamento (SNMP)" value={deviceName || 'Não informado'} />
              <InfoItem
                label="Tipo"
                value={printer.type === 'color' ? 'Colorida' : 'Monocromática'}
              />
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-6 px-4 py-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-sm">
              <strong>Erro SNMP:</strong> {error.message}
              {error.code && <span className="text-red-600 ml-2">({error.code})</span>}
            </div>
          )}

          {message && (
            <div
              className={`mx-6 mt-6 px-4 py-3 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="p-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={refreshing}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-sm disabled:opacity-50"
            >
              Testar conexão
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="px-5 py-2.5 rounded-xl bg-xerox-red text-white hover:bg-red-700 font-medium text-sm disabled:opacity-50"
            >
              {refreshing ? 'Consultando SNMP...' : 'Atualizar consumíveis'}
            </button>
            <Link
              to={`/impressora/${id}/editar`}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-sm"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="px-5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium text-sm ml-auto"
            >
              Excluir
            </button>
          </div>
        </div>

        <section className="mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Consumíveis</h3>
          {supplies ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {visibleKeys.map((key) => (
                <SupplyBar
                  key={key}
                  supplyKey={key}
                  label={SUPPLY_LABELS[key]}
                  supply={supplies[key]}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              Nenhum dado de consumíveis. Clique em &quot;Atualizar consumíveis&quot; para consultar via SNMP.
            </div>
          )}

          {otherSupplies.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Outros suprimentos detectados</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                {otherSupplies.map((s, i) => (
                  <SupplyBar key={i} label={s.name || `Suprimento ${i + 1}`} supply={s} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Bandejas / Papel</h3>
          {trays.length > 0 ? (
            <div className="grid gap-4">
              {trays.map((tray, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-6 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-slate-900">{tray.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Papel: {tray.paperType || 'Não informado pelo equipamento'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${TRAY_ALERT[tray.status] || 'bg-slate-100 text-slate-600'}`}>
                    {tray.status}
                  </span>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Quantidade</p>
                    <p className="font-bold text-slate-800">{formatTrayQuantity(tray)}</p>
                  </div>
                  {tray.available && typeof tray.percentage === 'number' && Number.isFinite(tray.percentage) && (
                    <div className="w-32">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            tray.alertLevel === 'red' ? 'bg-red-500' :
                            tray.alertLevel === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${tray.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Não informado pelo equipamento — bandejas não retornadas via SNMP ou impressora offline.
            </div>
          )}
        </section>

        {liveData?.lastUpdated && (
          <p className="text-xs text-slate-400 mt-8 text-center">
            Última atualização: {new Date(liveData.lastUpdated).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </Layout>
  );
}

function InfoItem({ label, value, mono }) {
  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className={`font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
