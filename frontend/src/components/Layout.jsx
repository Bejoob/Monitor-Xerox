import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-xerox-dark text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-xerox-red flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 8H5a3 3 0 0 0-3 3v6h2v4h14v-4h2v-6a3 3 0 0 0-3-3zm-1 10H6v-4h12v4zm1-6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-3-6V3H8v3H6v4h12V8h-2z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Monitor Xerox</h1>
                <p className="text-xs text-slate-400">Consumíveis via SNMP</p>
              </div>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/cadastro"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/cadastro'
                    ? 'bg-xerox-red text-white'
                    : 'bg-xerox-red/80 text-white hover:bg-xerox-red'
                }`}
              >
                + Nova Impressora
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        Monitoramento SNMP · Printer-MIB · Atualização automática a cada 5 min
      </footer>
    </div>
  );
}
