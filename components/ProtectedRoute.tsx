import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const isTokenValid = (token: string | null) => {
  if (!token) return false;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    const exp = decoded.exp;
    if (exp && Date.now() >= exp * 1000) {
      return false; // expired
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (isTokenValid(token)) {
      setIsValid(true);
    } else {
      localStorage.removeItem('admin_token');
      setIsValid(false);
    }
  }, []);

  if (isValid === null) {
    return null; // or a loading spinner
  }

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
