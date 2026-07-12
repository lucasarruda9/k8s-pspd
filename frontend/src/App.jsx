import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { isMockMode } from './services/keycloak';
import { getMockUser, mockLogout } from './services/mockAuth';
import { getKeycloakUser, keycloakLogout } from './services/keycloakAuth';

function App() {
  const DASHBOARD_PATH = '/dashboard';
  //guarda os dados do usuario logado no momento
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [inicializado, setInicializado] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    if (isMockMode) {
      const user = getMockUser();
      if (user) {
        setUsuarioLogado(user);
        navegar(DASHBOARD_PATH);
      }
      setInicializado(true);
    } else {
      const user = getKeycloakUser();
      if (user) {
        setUsuarioLogado(user);
        navegar(DASHBOARD_PATH);
      }
      setInicializado(true);
    }
  }, [navegar]);

  const realizarLogout = () => {
    setUsuarioLogado(null);
    if (isMockMode) {
      mockLogout();
    } else {
      keycloakLogout();
    }
    navegar('/login');
  };

  if (!inicializado) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Carregando Segurança...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          usuarioLogado
            ? <Dashboard usuario={usuarioLogado} aoDeslogar={realizarLogout} />
            : <Navigate to="/login" replace />
        }
      />
      {/* Qualquer rota desconhecida redireciona para o destino correto */}
      <Route path="*" element={<Navigate to={usuarioLogado ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
