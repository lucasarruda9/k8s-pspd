import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import keycloak, { initKeycloak, doLogout, isMockMode } from './services/keycloak';
import { getMockUser, mockLogout } from './services/mockAuth';

function App() {
  //guarda os dados do usuario logado no momento
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [inicializado, setInicializado] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    initKeycloak((autenticado) => {
      if (autenticado) {
        let dadosUsuario;
        if (isMockMode) {
          dadosUsuario = getMockUser();
        } else {
          // Extrai as informações do Token JWT
          const tokenParsed = keycloak.tokenParsed;
          dadosUsuario = {
            username: tokenParsed.preferred_username,
            role: tokenParsed.realm_access?.roles?.find(r =>
              ['MEDICO', 'PESQUISADOR', 'ESTAGIARIO'].includes(r.toUpperCase())
            )?.toUpperCase() || 'DESCONHECIDO'
          };
        }
        setUsuarioLogado(dadosUsuario);
        navegar('/dashboard');
      }
      setInicializado(true);
    });
  }, [navegar]);

  //funcao para limpar a sessao e redirecionar para o login
  const realizarLogout = () => {
    setUsuarioLogado(null);
    if (isMockMode) {
      mockLogout();
      navegar('/login');
    } else {
      doLogout();
    }
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
