export default async function (fastify, opts) {
  // Lista todos para a tabela principal
  fastify.get('/', async (req, reply) => {
    // Chamar gRPC: client.ListPatients({})
    return [{ id: 1, nome: "Paciente A", status: "Estável" }];
  });

  // Detalhe de um paciente específico (ao clicar na linha)
  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params;
    // Chamar gRPC: client.GetPatientById({ id })
    return { id, nome: "Paciente A", historico: "..." };
  });
}