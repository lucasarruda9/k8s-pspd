import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './Dashboard.css';

//componente generico para evitar clones de codigo (JSCPD)
const TabelaGenerica = ({ colunas, dados, renderizarLinha }) => (
  <div className="data-table-container glass-panel">
    <table className="data-table">
      <thead>
        <tr>
          {colunas.map((coluna, index) => (
            <th key={index}>{coluna}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dados.map(renderizarLinha)}
      </tbody>
    </table>
  </div>
);

//componente para a visao do medico que pode ver tudo
const VisaoDoMedico = ({ pacientes }) => (
  <div className="view-container">
    <h2>Meus Pacientes</h2>
    
    <TabelaGenerica 
      colunas={['Nome Completo', 'CPF', 'Nascimento', 'Último Diagnóstico', 'Ação']}
      dados={pacientes}
      renderizarLinha={(paciente) => (
        <tr key={paciente.id}>
          <td>{paciente.nomeCompleto}</td>
          <td>{paciente.cpf}</td>
          <td>{paciente.nascimento}</td>
          <td>{paciente.diagnostico}</td>
          <td><button className="btn">Prontuário Completo</button></td>
        </tr>
      )}
    />
  </div>
);

//componente para a visao do estagiario que ve coisas censuradas
const VisaoDoEstagiario = ({ pacientes }) => (
  <div className="view-container">
    <h2>Pacientes Supervisionados</h2>
    
    <TabelaGenerica 
      colunas={['Iniciais', 'Idade', 'Sexo', 'Último Diagnóstico', 'Ação']}
      dados={pacientes}
      renderizarLinha={(paciente) => (
        <tr key={paciente.id}>
          <td>{paciente.iniciais}</td>
          <td>{paciente.idade}</td>
          <td>{paciente.sexo}</td>
          <td>{paciente.diagnostico}</td>
          <td><button className="btn">Ver Exames</button></td>
        </tr>
      )}
    />
  </div>
);

//componente para o pesquisador que so ve estatisticas e dados
const VisaoDoPesquisador = ({ estatisticas, amostras }) => (
  <div className="view-container">
    <h2>Painel de Pesquisa</h2>
    
    <div className="dashboard-grid">
      <div className="stat-card glass-panel">
        <h3>Total de Pacientes na Coorte</h3>
        <p className="stat-value">{estatisticas.totalPacientes}</p>
      </div>
      <div className="stat-card glass-panel">
        <h3>Distribuição por Sexo</h3>
        <p className="stat-value">{estatisticas.distribuicaoSexo}</p>
      </div>
      <div className="stat-card glass-panel">
        <h3>Média de Idade (Diabetes)</h3>
        <p className="stat-value">{estatisticas.mediaIdadeDiabetes}</p>
      </div>
    </div>

    <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Amostra de Exames Anonimizados</h3>
    
    <TabelaGenerica 
      colunas={['Pseudo-ID', 'Idade', 'Sexo', 'HbA1c', 'Glicemia', 'IMC']}
      dados={amostras}
      renderizarLinha={(amostra) => (
        <tr key={amostra.id}>
          <td>{amostra.id}</td>
          <td>{amostra.idade}</td>
          <td>{amostra.sexo}</td>
          <td>{amostra.hba1c}</td>
          <td>{amostra.glicemia}</td>
          <td>{amostra.imc}</td>
        </tr>
      )}
    />
  </div>
);

export default function Dashboard({ usuario, aoDeslogar }) {
  const [dadosDaVisao, setDadosDaVisao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);
        if (usuario?.role === 'medico' || usuario?.role === 'estagiario') {
          const res = await api.get('/patients');
          setDadosDaVisao({ tipo: usuario.role, pacientes: res.data });
        } else if (usuario?.role === 'pesquisador') {
          const resEstat = await api.get('/patients/statistics/1');
          const resAmostra = await api.get('/patients/cohorts/1');
          setDadosDaVisao({ 
            tipo: 'pesquisador', 
            estatisticas: resEstat.data, 
            amostras: resAmostra.data?.patients || resAmostra.data || [] 
          });
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao buscar dados do API Gateway.');
      } finally {
        setLoading(false);
      }
    };
    
    if (usuario?.role) {
      fetchDados();
    }
  }, [usuario]);

  //funcao que decide qual tela mostrar baseada no tipo de usuario
  const decidirOQueMostrar = () => {
    if (loading) return <p>Carregando dados seguros do servidor...</p>;
    if (error) return <p style={{color: 'red'}}>{error}</p>;
    if (!dadosDaVisao) return <p>Perfil não autorizado ou sem dados.</p>;

    switch (dadosDaVisao.tipo) {
      case 'medico':
        return <VisaoDoMedico pacientes={dadosDaVisao.pacientes} />;
      case 'estagiario':
        return <VisaoDoEstagiario pacientes={dadosDaVisao.pacientes} />;
      case 'pesquisador':
        return <VisaoDoPesquisador estatisticas={dadosDaVisao.estatisticas} amostras={dadosDaVisao.amostras} />;
      default:
        return <p>Perfil não autorizado.</p>;
    }
  };

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="logo-icon-small">⚕️</span>
          <h1>Sistema Clínico</h1>
        </div>
        <div className="user-profile">
          <span className="user-info">
            <strong>{usuario?.username}</strong>
            <span className="badge">{usuario?.role}</span>
          </span>
          <button className="btn-logout" onClick={aoDeslogar}>Sair</button>
        </div>
      </header>

      <main className="dashboard-content">
        {decidirOQueMostrar()}
      </main>
    </div>
  );
}
