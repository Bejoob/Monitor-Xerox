import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Layout from '../components/Layout';
import PrinterForm from '../components/PrinterForm';

export default function AddPrinter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    api.getPrinter(id)
      .then(setInitial)
      .catch((e) => setError(e.message))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  if (isEdit && fetching) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">Carregando...</div>
      </Layout>
    );
  }

  const handleSubmit = async (form) => {
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updatePrinter(id, form);
        navigate(`/impressora/${id}`);
      } else {
        const created = await api.createPrinter(form);
        navigate(`/impressora/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isEdit ? 'Editar impressora' : 'Cadastrar impressora'}
        </h2>
        <p className="text-slate-600 mb-8">
          Preencha os dados da impressora Xerox. A consulta SNMP será feita pelo servidor.
        </p>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <PrinterForm
            initial={initial}
            onSubmit={handleSubmit}
            onCancel={() => navigate(isEdit ? `/impressora/${id}` : '/')}
            loading={loading}
          />
        </div>
      </div>
    </Layout>
  );
}
