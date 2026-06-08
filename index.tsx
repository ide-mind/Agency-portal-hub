import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { ClientPortal } from './components/ClientPortal';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/:clientId" element={<ClientPortal />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);