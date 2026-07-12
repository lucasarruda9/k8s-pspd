import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from './Login';
import { doLogin } from '../services/keycloak';

// Mock do serviço de login do Keycloak e da telemetria
vi.mock('../services/keycloak', () => ({
  doLogin: vi.fn(),
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
      callback(span);
    }
  })
}));

describe('Login Component', () => {
  it('deve renderizar o formulário de login corretamente', () => {
    render(<Login />);
    
    expect(screen.getByText('Sistema Clínico')).toBeInTheDocument();
    expect(screen.getByText('Acesso restrito via provedor de identidade.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar via Keycloak/i })).toBeInTheDocument();
  });

  it('deve chamar doLogin do Keycloak ao clicar no botão', () => {
    render(<Login />);
    
    const botaoDeEntrar = screen.getByRole('button', { name: /Entrar via Keycloak/i });

    //simula o clique no botao
    fireEvent.click(botaoDeEntrar);

    //verifica se a funcao de login do Keycloak foi chamada
    expect(doLogin).toHaveBeenCalledTimes(1);
  });

  it('deve exibir mensagem de erro se doLogin falhar', async () => {
    doLogin.mockImplementation(() => {
      throw new Error('Erro forçado no login');
    });

    render(<Login />);
    
    const botaoDeEntrar = screen.getByRole('button', { name: /Entrar via Keycloak/i });
    fireEvent.click(botaoDeEntrar);

    expect(await screen.findByText('Falha ao redirecionar para o Keycloak')).toBeInTheDocument();
  });
});
