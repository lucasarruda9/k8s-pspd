import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTracer } from '../services/telemetry';
import { isMockMode } from '../services/keycloak';
import { mockLogin } from '../services/mockAuth';
import { keycloakLogin } from '../services/keycloakAuth';
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
  const navegar = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErro('Informe o usuário e a senha.');
      return;
    }
    setCarregando(true);
    setErro('');
    const tracer = getTracer();
    tracer.startActiveSpan('user_login_click', async (span) => {
      span.setAttribute('event.action', 'login_button_clicked');
      try {
        await keycloakLogin(username.trim(), password.trim());
        span.setStatus({ code: 1 });
        navegar('/dashboard');
        window.location.href = '/dashboard';
      } catch (err) {
        span.recordException(err);
        span.setStatus({ code: 2, message: err.message });
        setErro(err.message || 'Falha ao autenticar no Keycloak.');
      } finally {
        span.end();
        setCarregando(false);
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

        {erro && <div className="error-message" role="alert">{erro}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="kc-username">Usuário</label>
            <input
              id="kc-username"
              type="text"
              placeholder="ex: med.cardoso"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="kc-password">Senha</label>
            <input
              id="kc-password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn w-100" disabled={carregando}>
            {carregando ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  return isMockMode ? <MockLoginForm /> : <KeycloakLoginForm />;
}
