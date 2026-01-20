
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import ServiceOrders from './views/ServiceOrders';
import Login from './views/Login';

const ProtectedRoute: React.FC<{ children: React.ReactElement; module?: string }> = ({ children, module }) => {
  const { currentUser, rolePermissions, loading } = useApp();
  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest">Carregando ERP...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (module) {
    const perms = rolePermissions[currentUser.role];
    if (perms && !perms[module as keyof typeof perms]) return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/pdv" element={<ProtectedRoute module="pdv"><PDV /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute module="customers"><Layout><Customers /></Layout></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute module="reports"><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/estoque" element={<ProtectedRoute module="inventory"><Layout><Inventory /></Layout></ProtectedRoute>} />
      <Route path="/balanco" element={<ProtectedRoute module="balance"><Layout><Balance /></Layout></ProtectedRoute>} />
      <Route path="/servicos" element={<ProtectedRoute module="serviceOrders"><Layout><ServiceOrders /></Layout></ProtectedRoute>} />
      <Route path="/entradas" element={<ProtectedRoute module="incomes"><Layout><Transactions type="INCOME" /></Layout></ProtectedRoute>} />
      <Route path="/saidas" element={<ProtectedRoute module="expenses"><Layout><Transactions type="EXPENSE" /></Layout></ProtectedRoute>} />
      <Route path="/dre" element={<ProtectedRoute module="financial"><Layout><DRE /></Layout></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute module="settings"><Layout><Settings /></Layout></ProtectedRoute>} />
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
