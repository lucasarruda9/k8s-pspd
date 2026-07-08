import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from './Login';

describe('Login Component', () => {
  it('deve renderizar o formulário de login corretamente', () => {
    render(<Login aoLogar={() => {}} />);
    
    expect(screen.getByText('Acesso ao Sistema')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: dr.joao')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Autenticar/i })).toBeInTheDocument();
  });

  it('deve submeter o formulário e chamar aoLogar com os dados corretos', () => {
    const funcaoSimuladaDeLogin = vi.fn();
    render(<Login aoLogar={funcaoSimuladaDeLogin} />);
    
    const campoDeUsuario = screen.getByPlaceholderText('Ex: dr.joao');
    const selecaoDePerfil = screen.getByRole('combobox');
    const botaoDeEntrar = screen.getByRole('button', { name: /Autenticar/i });

    //simula a interacao do usuario digitando as coisas
    fireEvent.change(campoDeUsuario, { target: { value: 'medico.teste' } });
    fireEvent.change(selecaoDePerfil, { target: { value: 'MEDICO' } });
    fireEvent.click(botaoDeEntrar);

    //verifica se a funcao foi chamada corretamente com o payload esperado
    expect(funcaoSimuladaDeLogin).toHaveBeenCalledTimes(1);
    expect(funcaoSimuladaDeLogin).toHaveBeenCalledWith({ username: 'medico.teste', role: 'MEDICO' });
  });
});
