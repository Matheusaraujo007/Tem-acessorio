
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
import ServiceOrders from './views/ServiceOrders';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/pdv" element={<PDV />} />
      <Route path="/clientes" element={<Layout><Customers /></Layout>} />
      <Route path="/relatorios" element={<Layout><Reports /></Layout>} />
      <Route path="/estoque" element={<Layout><Inventory /></Layout>} />
      <Route path="/balanco" element={<Layout><Balance /></Layout>} />
      <Route path="/servicos" element={<Layout><ServiceOrders /></Layout>} />
      <Route path="/entradas" element={<Layout><Transactions type="INCOME" /></Layout>} />
      <Route path="/saidas" element={<Layout><Transactions type="EXPENSE" /></Layout>} />
      <Route path="/dre" element={<Layout><DRE /></Layout>} />
      <Route path="/config" element={<Layout><Settings /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  </AppProvider>
);

export default App;
