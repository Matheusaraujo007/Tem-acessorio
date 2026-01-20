
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './AppContext';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import PDV from './views/PDV';
import Inventory from './views/Inventory';
import Transactions from './views/Transactions';
import DRE from './views/DRE';
import Settings from './views/Settings';
import Reports from './views/Reports';
import Balance from './views/Balance';
import Customers from './views/Customers';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/estoque" element={<Inventory />} />
            <Route path="/balanco" element={<Balance />} />
            <Route path="/entradas" element={<Transactions type="INCOME" />} />
            <Route path="/saidas" element={<Transactions type="EXPENSE" />} />
            <Route path="/dre" element={<DRE />} />
            <Route path="/config" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
