import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuthStore } from './store/useAuthStore';
import { Login, Dashboard, Products, Orders, Stock, Users, Roles, Suppliers } from './pages';

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
          <Route path="master/suppliers" element={<Suppliers />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="stock" element={<Stock />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
