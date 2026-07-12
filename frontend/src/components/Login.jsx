import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTracer } from '../services/telemetry';
import { doLogin, isMockMode } from '../services/keycloak';
import { mockLogin } from '../services/mockAuth';
import './Login.css';

// mock (sem Keycloak)
function MockLoginForm() {
  const navegar = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErro('Informe um nome de usuário e uma senha.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      await mockLogin(username.trim(), password.trim());
      navegar('/dashboard');
      // força reload para o App.jsx re-inicializar com o usuário do localStorage
      window.location.href = '/dashboard';
    } catch (err) {
      setErro(err.message || 'Erro ao realizar login mock.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="login-icon">⚥️</span>
          <h1>Sistema Clínico</h1>
          <p>
             <strong>Modo Desenvolvimento</strong>: autenticacao local ativa.
          </p>
        </div>

        {erro && (
          <div className="error-message" role="alert">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="mock-username">Usuário</label>
            <input
              id="mock-username"
              type="text"
              placeholder="ex: joao.silva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="mock-password">Senha</label>
            <input
              id="mock-password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn w-100"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar (Modo Dev)'}
          </button>
        </form>
      </div>
    </div>
  );
}

function KeycloakLoginForm() {
  const [erro, setErro] = useState('');

  const lidarComEnvio = (e) => {
    e.preventDefault();
    setErro('');

    const tracer = getTracer();
    tracer.startActiveSpan('user_login_click', (span) => {
      span.setAttribute('event.action', 'login_button_clicked');
      try {
        doLogin();
        span.setStatus({ code: 1 }); // 1 = OK no OpenTelemetry
      } catch (erro) {
        span.recordException(erro);
        span.setStatus({ code: 2, message: erro.message }); // 2 = ERROR no OpenTelemetry
        setErro('Falha ao redirecionar para o Keycloak');
      } finally {
        span.end();
      }
    });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel">
        <div className="login-header">
          <span className="login-icon">⚥️</span>
          <h1>Sistema Clínico</h1>
          <p>Acesso restrito via provedor de identidade.</p>
        </div>

        {erro && <div className="error-message" role="alert" style={{ color: 'red', marginBottom: '16px', textAlign: 'center' }}>{erro}</div>}

        <form onSubmit={lidarComEnvio} className="login-form">
          <button type="submit" className="btn w-100">
            Entrar via Keycloak
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  return isMockMode ? <MockLoginForm /> : <KeycloakLoginForm />;
}
