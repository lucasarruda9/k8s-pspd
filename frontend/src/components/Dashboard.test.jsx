import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import * as mockData from '../services/mockData';

//Mock do serviço de dados
vi.mock('../services/mockData', () => ({
  getDadosPorPerfil: vi.fn(),
}));

describe('Dashboard Component', () => {
  const mockAoDeslogar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o cabeçalho corretamente', () => {
    mockData.getDadosPorPerfil.mockReturnValue({ tipo: 'medico', pacientes: [] });
    render(<Dashboard usuario={{ username: 'dr.teste', role: 'MEDICO' }} aoDeslogar={mockAoDeslogar} />);
    
    expect(screen.getByText('Sistema Clínico')).toBeInTheDocument();
    expect(screen.getByText('dr.teste')).toBeInTheDocument();
    expect(screen.getByText('MEDICO')).toBeInTheDocument();
  });

  it('deve chamar aoDeslogar ao clicar no botão Sair', () => {
    mockData.getDadosPorPerfil.mockReturnValue({ tipo: 'medico', pacientes: [] });
    render(<Dashboard usuario={{ username: 'dr.teste', role: 'MEDICO' }} aoDeslogar={mockAoDeslogar} />);
    
    fireEvent.click(screen.getByText('Sair'));
    expect(mockAoDeslogar).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar a visão do Médico corretamente', () => {
    mockData.getDadosPorPerfil.mockReturnValue({
      tipo: 'medico',
      pacientes: [{ id: 1, nomeCompleto: 'João Médico', cpf: '111', nascimento: '2000', diagnostico: 'X' }]
    });

    render(<Dashboard usuario={{ username: 'dr.teste', role: 'MEDICO' }} aoDeslogar={mockAoDeslogar} />);
    
    expect(screen.getByText('Meus Pacientes')).toBeInTheDocument();
    expect(screen.getByText('João Médico')).toBeInTheDocument();
  });

  it('deve renderizar a visão do Estagiário corretamente', () => {
    mockData.getDadosPorPerfil.mockReturnValue({
      tipo: 'estagiario',
      pacientes: [{ id: 1, iniciais: 'J. M.', idade: '20', sexo: 'M', diagnostico: 'Y' }]
    });

    render(<Dashboard usuario={{ username: 'estagiario.teste', role: 'ESTAGIARIO' }} aoDeslogar={mockAoDeslogar} />);
    
    expect(screen.getByText('Pacientes Supervisionados')).toBeInTheDocument();
    expect(screen.getByText('J. M.')).toBeInTheDocument();
  });

  it('deve renderizar a visão do Pesquisador corretamente', () => {
    mockData.getDadosPorPerfil.mockReturnValue({
      tipo: 'pesquisador',
      estatisticas: { totalPacientes: '100', distribuicaoSexo: '50/50', mediaIdadeDiabetes: '50' },
      amostras: [{ id: 'hash01', idade: 50, sexo: 'M', hba1c: 7, glicemia: 100, imc: 25 }]
    });

    render(<Dashboard usuario={{ username: 'pesquisador.teste', role: 'PESQUISADOR' }} aoDeslogar={mockAoDeslogar} />);
    
    expect(screen.getByText('Painel de Pesquisa')).toBeInTheDocument();
    expect(screen.getByText('hash01')).toBeInTheDocument();
  });

  it('deve exibir mensagem para perfil não autorizado', () => {
    mockData.getDadosPorPerfil.mockReturnValue(null);

    render(<Dashboard usuario={{ username: 'hacker', role: 'DESCONHECIDO' }} aoDeslogar={mockAoDeslogar} />);
    
    expect(screen.getByText('Perfil não autorizado ou carregando.')).toBeInTheDocument();
  });
});
