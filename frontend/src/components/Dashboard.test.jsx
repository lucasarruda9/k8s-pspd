import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { api } from '../services/api';

//Mock do serviço da API
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Dashboard Component', () => {
  const mockAoDeslogar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboardPadrao = async () => {
    api.get.mockResolvedValue({ data: [] });
    await act(async () => {
      render(<Dashboard usuario={{ username: 'dr.teste', role: 'medico' }} aoDeslogar={mockAoDeslogar} />);
    });
  };

  it('deve renderizar o cabeçalho corretamente', async () => {
    await renderDashboardPadrao();

    expect(screen.getByText('Sistema Clínico')).toBeInTheDocument();
    expect(screen.getByText('dr.teste')).toBeInTheDocument();
    expect(screen.getByText('medico')).toBeInTheDocument();
  });

  it('deve chamar aoDeslogar ao clicar no botão Sair', async () => {
    await renderDashboardPadrao();

    fireEvent.click(screen.getByText('Sair'));
    expect(mockAoDeslogar).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar a visão do Médico corretamente', async () => {
    api.get.mockResolvedValue({
      data: [{ id: 1, nomeCompleto: 'João Médico', cpf: '111', nascimento: '2000', diagnostico: 'X' }]
    });

    render(<Dashboard usuario={{ username: 'dr.teste', role: 'medico' }} aoDeslogar={mockAoDeslogar} />);

    expect(await screen.findByText('Meus Pacientes')).toBeInTheDocument();
    expect(await screen.findByText('João Médico')).toBeInTheDocument();
  });

  it('deve renderizar a visão do Estagiário corretamente', async () => {
    api.get.mockResolvedValue({
      data: [{ id: 1, iniciais: 'J. M.', idade: '20', sexo: 'M', diagnostico: 'Y' }]
    });

    render(<Dashboard usuario={{ username: 'estagiario.teste', role: 'estagiario' }} aoDeslogar={mockAoDeslogar} />);

    expect(await screen.findByText('Pacientes Supervisionados')).toBeInTheDocument();
    expect(await screen.findByText('J. M.')).toBeInTheDocument();
  });

  it('deve renderizar a visão do Pesquisador corretamente', async () => {
    // Para pesquisador faz 2 chamadas: statistics e cohorts
    api.get.mockResolvedValueOnce({
      data: { 
        totalPacientes: '100', 
        distribuicaoSexo: '50/50', 
        mediaIdadeDiabetes: '50',
        sample_exams: [{ pseudo_id: 'hash01', age: 50, gender: 'M', hba1c: 7, glicemia: 100, imc: 25 }]
      }
    }).mockResolvedValueOnce({
      data: []
    });

    render(<Dashboard usuario={{ username: 'pesquisador.teste', role: 'pesquisador' }} aoDeslogar={mockAoDeslogar} />);

    expect(await screen.findByText('Painel de Pesquisa')).toBeInTheDocument();
    expect(await screen.findByText('hash01')).toBeInTheDocument();
  });

  it('deve exibir mensagem para perfil não autorizado', async () => {
    render(<Dashboard usuario={{ username: 'hacker', role: 'DESCONHECIDO' }} aoDeslogar={mockAoDeslogar} />);

    expect(await screen.findByText('Perfil não autorizado ou sem dados.')).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando a API falha', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));

    render(<Dashboard usuario={{ username: 'dr.teste', role: 'medico' }} aoDeslogar={mockAoDeslogar} />);

    expect(await screen.findByText('Erro ao buscar dados do API Gateway.')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it('deve exportar FHIR ao clicar no botão e chamar a API de transformação', async () => {
    api.get.mockResolvedValue({
      data: [{ id: 1, nomeCompleto: 'Paciente Teste', nascimento: '1990', diagnostico: 'Z00' }]
    });
    api.post.mockResolvedValue({ data: [] });

    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    const mockClick = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = mockClick;
      return el;
    });

    render(<Dashboard usuario={{ username: 'dr.teste', role: 'medico' }} aoDeslogar={mockAoDeslogar} />);

    await screen.findByText('Meus Pacientes');

    await act(async () => {
      fireEvent.click(screen.getByText('⬇ Exportar FHIR'));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/transform/transform-fhir',
        expect.objectContaining({ access_level: 'FULL' })
      );
    });

    expect(mockClick).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
