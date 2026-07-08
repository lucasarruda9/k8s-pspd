import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  //guarda os dados do usuario logado no momento
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const navegar = useNavigate();

  //funcao que recebe os dados quando o usuario entra e navega para o dashboard
  const realizarLogin = (dadosDoUsuario) => {
    setUsuarioLogado(dadosDoUsuario);
    navegar('/dashboard');
  };

  //funcao para limpar a sessao e redirecionar para o login
  const realizarLogout = () => {
    setUsuarioLogado(null);
    navegar('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login aoLogar={realizarLogin} />} />
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
