import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import keycloak, { initKeycloak, doLogout } from './services/keycloak';

function App() {
  //guarda os dados do usuario logado no momento
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [inicializado, setInicializado] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    initKeycloak((autenticado) => {
      if (autenticado) {
        // Extrai as informações do Token JWT
        const tokenParsed = keycloak.tokenParsed;
        setUsuarioLogado({
          username: tokenParsed.preferred_username,
          // O Keycloak armazena as roles do client ou realm. Para simplificar, vamos assumir que injetamos num claim 'role' ou usar a role do realm
          role: tokenParsed.realm_access?.roles?.find(r => ['MEDICO', 'PESQUISADOR', 'ESTAGIARIO'].includes(r.toUpperCase()))?.toUpperCase() || 'DESCONHECIDO'
        });
        navegar('/dashboard');
      }
      setInicializado(true);
    });
  }, []);

  //funcao para limpar a sessao e redirecionar para o login
  const realizarLogout = () => {
    setUsuarioLogado(null);
    doLogout();
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
