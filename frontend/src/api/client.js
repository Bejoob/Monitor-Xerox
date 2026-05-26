const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.errors?.join(', ') || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  getPrinters: () => request('/printers'),
  getPrinter: (id) => request(`/printers/${id}`),
  createPrinter: (body) => request('/printers', { method: 'POST', body: JSON.stringify(body) }),
  updatePrinter: (id, body) => request(`/printers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePrinter: (id) => request(`/printers/${id}`, { method: 'DELETE' }),
  getStatus: (id) => request(`/printers/${id}/status`),
  getSupplies: (id) => request(`/printers/${id}/supplies`),
  testConnection: (id) => request(`/printers/${id}/test`, { method: 'POST' }),
  refreshPrinter: (id) => request(`/printers/${id}/refresh`, { method: 'POST' }),
};
