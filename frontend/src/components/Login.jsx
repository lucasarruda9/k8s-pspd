import React, { useState } from 'react';
import { autenticar } from '../services/mockAuth';
import { getTracer } from '../services/telemetry';
import './Login.css';

export default function Login({ aoLogar }) {
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [perfilDeAcesso, setPerfilDeAcesso] = useState('MEDICO');

  const lidarComEnvioDoFormulario = (evento) => {
    evento.preventDefault();
    const tracer = getTracer();
    tracer.startActiveSpan('user_login_click', (span) => {
      span.setAttribute('user.username', nomeUsuario);
      span.setAttribute('user.role', perfilDeAcesso);
      
      try {
        const dadosDoUsuario = autenticar(nomeUsuario, perfilDeAcesso);
        aoLogar(dadosDoUsuario);
        span.addEvent('autenticacao_sucesso');
      } catch (erro) {
        span.recordException(erro);
        span.setStatus({ code: 2, message: erro.message });
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
          <h1>Acesso ao Sistema</h1>
          <p>Insira suas credenciais para acessar os dados clínicos.</p>
        </div>

        <form onSubmit={lidarComEnvioDoFormulario} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              id="username"
              type="text"
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
              placeholder="Ex: dr.joao"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Perfil de Acesso</label>
            <div className="custom-select-wrapper">
              <select
                id="role"
                value={perfilDeAcesso}
                onChange={(e) => setPerfilDeAcesso(e.target.value)}
              >
                <option value="MEDICO">Médico Responsável</option>
                <option value="ESTAGIARIO">Estagiário</option>
                <option value="PESQUISADOR">Pesquisador</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn w-100">Autenticar</button>
        </form>
      </div>
    </div>
  );
}
