import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock do serviço de autenticação Keycloak real
vi.mock('../services/keycloakAuth', () => ({
  keycloakLogin: vi.fn(),
}));

vi.mock('../services/keycloak', () => ({
  isMockMode: false,
}));

vi.mock('../services/telemetry', () => ({
  getTracer: () => ({
    startActiveSpan: (nome, callback) => {
      const span = {
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      };
      return callback(span);
    }
  })
}));

import { keycloakLogin } from '../services/keycloakAuth';

const renderLogin = () => render(
  <MemoryRouter>
    <Login />
  </MemoryRouter>
);

describe('Login Component', () => {
  it('deve renderizar o formulário de login corretamente', () => {
    renderLogin();

    expect(screen.getByText('Sistema Clínico')).toBeInTheDocument();
    expect(screen.getByText('Acesso restrito via provedor de identidade.')).toBeInTheDocument();
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('deve chamar keycloakLogin ao submeter o formulário', async () => {
    keycloakLogin.mockResolvedValueOnce({ username: 'med.cardoso', role: 'MEDICO' });

    renderLogin();

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'med.cardoso' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'PseudoPEP2026!' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => expect(keycloakLogin).toHaveBeenCalledWith('med.cardoso', 'PseudoPEP2026!'));
  });

  it('deve exibir mensagem de erro se keycloakLogin falhar', async () => {
    keycloakLogin.mockRejectedValueOnce(new Error('Usuário ou senha inválidos.'));

    renderLogin();

    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'errado' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    expect(await screen.findByText('Usuário ou senha inválidos.')).toBeInTheDocument();
  });
});
