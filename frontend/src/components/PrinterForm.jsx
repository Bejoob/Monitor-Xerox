import React from 'react';

export default function PrinterForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = React.useState({
    name: initial?.name || '',
    model: initial?.model || '',
    ip: initial?.ip || '',
    location: initial?.location || '',
    type: initial?.type || 'monochrome',
    snmpCommunity: initial?.snmpCommunity || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.snmpCommunity) delete payload.snmpCommunity;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome da impressora *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none"
            placeholder="Ex: Xerox RH - 01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Modelo *</label>
          <input
            name="model"
            value={form.model}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none"
            placeholder="Ex: VersaLink C7025"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Endereço IP *</label>
          <input
            name="ip"
            value={form.ip}
            onChange={handleChange}
            required
            pattern="^(\d{1,3}\.){3}\d{1,3}$"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none font-mono"
            placeholder="192.168.1.100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Localização *</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none"
            placeholder="Ex: RH - 2º andar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none"
          >
            <option value="monochrome">Monocromática</option>
            <option value="color">Colorida</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Community SNMP (opcional)</label>
          <input
            name="snmpCommunity"
            value={form.snmpCommunity}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-xerox-red/30 focus:border-xerox-red outline-none font-mono"
            placeholder="Padrão: public (do servidor)"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-xerox-red text-white hover:bg-red-700 disabled:opacity-50 font-medium transition"
        >
          {loading ? 'Salvando...' : initial ? 'Salvar alterações' : 'Cadastrar impressora'}
        </button>
      </div>
    </form>
  );
}
