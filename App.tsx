
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
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
import Login from './views/Login';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Layout><Customers /></Layout></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/estoque" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
      <Route path="/balanco" element={<ProtectedRoute><Layout><Balance /></Layout></ProtectedRoute>} />
      <Route path="/entradas" element={<ProtectedRoute><Layout><Transactions type="INCOME" /></Layout></ProtectedRoute>} />
      <Route path="/saidas" element={<ProtectedRoute><Layout><Transactions type="EXPENSE" /></Layout></ProtectedRoute>} />
      <Route path="/dre" element={<ProtectedRoute><Layout><DRE /></Layout></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
