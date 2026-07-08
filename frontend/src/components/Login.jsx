import React, { useState } from 'react';
import { getTracer } from '../services/telemetry';
import { doLogin } from '../services/keycloak';
import './Login.css';

export default function Login() {
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
          <span className="login-icon">⚕️</span>
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
