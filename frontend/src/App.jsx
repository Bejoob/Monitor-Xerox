import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import PrinterDetail from './pages/PrinterDetail';
import AddPrinter from './pages/AddPrinter';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/cadastro" element={<AddPrinter />} />
      <Route path="/impressora/:id" element={<PrinterDetail />} />
      <Route path="/impressora/:id/editar" element={<AddPrinter />} />
    </Routes>
  );
}
