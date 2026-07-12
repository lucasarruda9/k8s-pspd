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
const VisaoDoMedico = ({ pacientes, abrirModal }) => (
  <div className="view-container">
    <h2>Meus Pacientes <span className="badge" style={{backgroundColor: '#10B981'}}>Acesso FULL</span></h2>
    
    <TabelaGenerica 
      colunas={['Nome Completo', 'CPF', 'Nascimento', 'Último Diagnóstico', 'Ações (Prontuário Completo)']}
      dados={pacientes}
      renderizarLinha={(paciente) => (
        <tr key={paciente.id}>
          <td>{paciente.nomeCompleto}</td>
          <td>{paciente.cpf}</td>
          <td>{paciente.nascimento}</td>
          <td>{paciente.diagnostico}</td>
          <td>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Resumo Clínico', paciente.id, 'events')}>Resumo</button>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Histórico Clínico', paciente.id, 'encounters')}>Histórico</button>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Exames Laboratoriais', paciente.id, 'events')}>Exames</button>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Medicamentos Prescritos', paciente.id, 'events')}>Medicamentos</button>
            </div>
          </td>
        </tr>
      )}
    />
  </div>
);

//componente para a visao do estagiario que ve coisas censuradas
const VisaoDoEstagiario = ({ pacientes, abrirModal }) => (
  <div className="view-container">
    <h2>Pacientes Supervisionados <span className="badge" style={{backgroundColor: '#F59E0B'}}>Acesso PARTIAL</span></h2>
    
    <TabelaGenerica 
      colunas={['Iniciais', 'Idade', 'Sexo', 'Último Diagnóstico', 'Ações (Dados Anonimizados)']}
      dados={pacientes}
      renderizarLinha={(paciente) => (
        <tr key={paciente.id}>
          <td>{paciente.iniciais}</td>
          <td>{paciente.idade}</td>
          <td>{paciente.sexo}</td>
          <td>{paciente.diagnostico}</td>
          <td>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Resumo Clínico', paciente.id, 'events')}>Resumo</button>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Exames Laboratoriais', paciente.id, 'events')}>Exames</button>
              <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => abrirModal('Medicamentos Prescritos', paciente.id, 'events')}>Medicamentos</button>
            </div>
          </td>
        </tr>
      )}
    />
  </div>
);

// Estilo extraído para evitar duplicação (SonarQube)
const detailHeaderStyle = { borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', marginBottom: '10px' };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', padding: '5px 0' };

//componente para o pesquisador que so ve estatisticas e dados
const VisaoDoPesquisador = ({ estatisticas, amostras }) => (
  <div className="view-container">
    <h2>Painel de Pesquisa <span className="badge" style={{backgroundColor: '#6366F1'}}>Acesso ANONYMIZED</span></h2>
    
    <div className="dashboard-grid">
      <div className="stat-card glass-panel">
        <h3>Total na Coorte</h3>
        <p className="stat-value">{estatisticas.totalPacientes || estatisticas.total_patients}</p>
      </div>
      <div className="stat-card glass-panel">
        <h3>Distribuição por Sexo</h3>
        <p className="stat-value" style={{ fontSize: '1.8rem' }}>{estatisticas.distribuicaoSexo || estatisticas.gender_distribution}</p>
      </div>
      <div className="stat-card glass-panel">
        <h3>Média de Idade</h3>
        <p className="stat-value" style={{ fontSize: '1.8rem' }}>{estatisticas.mediaIdadeDiabetes || estatisticas.average_age}</p>
      </div>
    </div>

    {/* Estatísticas Detalhadas */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
      
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px' }}>
        <h3 style={detailHeaderStyle}>Faixa Etária</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {estatisticas.age_ranges?.map((item, idx) => (
            <li key={idx} style={listItemStyle}>
              <span>{item.range} anos</span>
              <strong>{item.percentage}%</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px' }}>
        <h3 style={detailHeaderStyle}>Departamentos Mais Usados</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {estatisticas.departments?.map((item, idx) => (
            <li key={idx} style={listItemStyle}>
              <span>{item.department_name}</span>
              <strong>{item.percentage}%</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px' }}>
        <h3 style={detailHeaderStyle}>Medicamentos Comuns</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {estatisticas.medications?.map((item, idx) => (
            <li key={idx} style={listItemStyle}>
              <span>{item.medication_name}</span>
              <strong>{item.count} prescrições</strong>
            </li>
          ))}
        </ul>
      </div>

    </div>

    <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Amostra de Exames Anonimizados (Pseudo-ID)</h3>
    
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

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalDados, setModalDados] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        setLoading(true);
        const roleLower = usuario?.role?.toLowerCase();
        if (roleLower === 'medico' || roleLower === 'estagiario') {
          const res = await api.get('/patients');
          setDadosDaVisao({ tipo: roleLower, pacientes: res.data });
        } else if (roleLower === 'pesquisador') {
          const resEstat = await api.get('/patients/statistics/1');
          await api.get('/patients/cohorts/1'); // Chamada mantida por compatibilidade, mas o retorno não é mais usado
          setDadosDaVisao({ 
            tipo: 'pesquisador', 
            estatisticas: resEstat.data, 
            // Usa o sample_exams retornado pela estatística
            amostras: (resEstat.data?.sample_exams || []).map(e => ({
              id: e.pseudo_id,
              idade: e.age,
              sexo: e.gender,
              hba1c: e.hba1c,
              glicemia: e.glicemia,
              imc: e.imc
            }))
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

  const abrirModal = async (titulo, pacienteId, tipo) => {
    setModalTitulo(titulo);
    setModalAberto(true);
    setModalLoading(true);
    setModalDados(null);
    try {
      let endpoint = '';
      if (tipo === 'events') endpoint = `/patients/${pacienteId}`;
      else if (tipo === 'encounters') endpoint = `/patients/${pacienteId}/encounters`;
      
      const res = await api.get(endpoint);
      setModalDados(res.data);
    } catch (err) {
      console.error(err);
      setModalDados({ error: 'Erro ao carregar dados do prontuário.' });
    } finally {
      setModalLoading(false);
    }
  };

  const fecharModal = () => setModalAberto(false);


  //funcao que decide qual tela mostrar baseada no tipo de usuario
  const decidirOQueMostrar = () => {
    if (loading) return <p>Carregando dados seguros do servidor...</p>;
    if (error) return <p style={{color: 'red'}}>{error}</p>;
    if (!dadosDaVisao) return <p>Perfil não autorizado ou sem dados.</p>;

    switch (dadosDaVisao.tipo) {
      case 'medico':
        return <VisaoDoMedico pacientes={dadosDaVisao.pacientes} abrirModal={abrirModal} />;
      case 'estagiario':
        return <VisaoDoEstagiario pacientes={dadosDaVisao.pacientes} abrirModal={abrirModal} />;
      case 'pesquisador':
        return <VisaoDoPesquisador estatisticas={dadosDaVisao.estatisticas} amostras={dadosDaVisao.amostras} />;
      default:
        return <p>Perfil não autorizado.</p>;
    }
  };

  const exportarFHIR = async () => {
    if (!dadosDaVisao) return;
    
    let raw_patients = [];
    let raw_encounters = [];
    let raw_events = [];

    // Adapta os dados locais para o formato esperado pelo backend
    const dadosParaExportar = dadosDaVisao.pacientes || dadosDaVisao.amostras || [];
    
    dadosParaExportar.forEach(item => {
      raw_patients.push({
        id_paciente: item.id || item.pseudo_id || "unknown",
        nome: item.nomeCompleto || item.iniciais || "",
        data_nascimento: item.nascimento || item.idade?.toString() || "",
        genero: item.sexo || "",
        cpf: item.cpf || ""
      });
      if (item.diagnostico) {
        raw_events.push({
          id_paciente: item.id || "unknown",
          codigo_tipo_evento: item.diagnostico,
          tipo_evento: "Condição"
        });
      }
    });

    let access_level = "FULL";
    const userRole = usuario.role?.toLowerCase();
    if (userRole === "estagiario") access_level = "PARTIAL";
    if (userRole === "pesquisador") access_level = "ANONYMIZED";

    try {
      const response = await api.post('/transform/transform-fhir', {
        access_level,
        raw_patients,
        raw_encounters,
        raw_events
      });
      
      const { patients = [], encounters = [], conditions = [], observations = [], medications = [] } = response.data;
      
      const entries = [
        ...patients, 
        ...encounters, 
        ...conditions, 
        ...observations, 
        ...medications
      ].map(res => ({
        resource: res
      }));

      const fhirResource = {
        resourceType: "Bundle",
        type: "collection",
        entry: entries
      };

      const blob = new Blob([JSON.stringify(fhirResource, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prontuarios_fhir_${userRole}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar FHIR.');
    }
  };

  const renderModalContent = () => {
    if (modalLoading) {
      return <p>Buscando dados no banco...</p>;
    }
    if (modalDados?.error) {
      return <p style={{ color: 'red' }}>{modalDados.error}</p>;
    }
    if (modalDados && modalDados.length > 0) {
      return (
        <div className="modal-data-list">
          {modalDados
            .filter(item => {
              if (!item.tipo_evento) return true;
              const tipo = item.tipo_evento.toLowerCase();
              if (modalTitulo.includes('Medicamentos')) return tipo.includes('medic');
              if (modalTitulo.includes('Exames')) return tipo.includes('observ');
              return true;
            })
            .map((item, index) => (
              <div key={index} style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
                {item.tipo_atendimento ? (
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>{item.tipo_atendimento}</strong>
                    <span style={{ float: 'right', color: '#64748b' }}>
                      {new Date(item.data_inicio).toLocaleDateString('pt-BR')}
                    </span>
                    <p style={{ margin: '4px 0 0', color: '#475569' }}>
                      <strong>Setor:</strong> {item.setor_departamento}
                    </p>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>
                      {item.descricao_evento || item.codigo_tipo_evento}
                    </strong>
                    <span style={{ float: 'right', color: '#64748b' }}>
                      {new Date(item.data_evento).toLocaleDateString('pt-BR')}
                    </span>
                    <p style={{ margin: '4px 0 0', color: '#475569' }}>
                      <strong>Tipo:</strong> {item.tipo_evento?.toLowerCase()?.includes('medic') ? '💊 Medicamento' : '🔬 Exame'}
                      {item.valor && (
                        <span style={{ marginLeft: '16px' }}>
                          <strong>Resultado/Dose:</strong> {item.valor} {item.unidade_valor}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>
      );
    }
    return <p>Nenhum registro encontrado para este paciente.</p>;
  };

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="logo-icon-small">⚕️</span>
          <h1>Sistema Clínico</h1>
        </div>
        <div className="user-profile">
          <button className="btn" style={{marginRight: '15px', backgroundColor: '#8B5CF6'}} onClick={exportarFHIR}>
            ⬇ Exportar FHIR
          </button>
          <span className="user-info">
            <strong>{usuario.username}</strong>
            <span className="badge">{usuario.role}</span>
          </span>
          <button className="btn-logout" onClick={aoDeslogar}>Sair</button>
        </div>
      </header>

      <main className="dashboard-content">
        {decidirOQueMostrar()}
      </main>

      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTitulo}</h2>
              <button className="btn-close" onClick={fecharModal}>&times;</button>
            </div>
            <div className="modal-body">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
