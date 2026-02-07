import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuthStore } from './store/useAuthStore';
import { Login, Dashboard, Products, Orders, Stock, Users, Roles, Suppliers, PurchaseOrders, Customers, Warehouses, AuditLogs } from './pages';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/users" element={<Users />} />
          <Route path="admin/roles" element={<Roles />} />
          <Route path="admin/audit-logs" element={<AuditLogs />} />
          <Route path="master/suppliers" element={<Suppliers />} />
          <Route path="master/customers" element={<Customers />} />
          <Route path="master/warehouses" element={<Warehouses />} />
          <Route path="master/products" element={<Products />} />
          <Route path="operations/purchase-orders" element={<PurchaseOrders />} />
          <Route path="operations/sales-orders" element={<Orders />} />
          <Route path="operations/stock-movements" element={<Stock />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
