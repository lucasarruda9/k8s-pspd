export default async function (fastify, opts) {
  
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { username, role } = req.user; 
    
    const response = await fastify.grpcClient.FetchPatients({ 
      username, 
      role 
    });
    return response.patients;
  });

  fastify.get('/projects/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const payload = JSON.stringify({ 
      preferred_username: req.user.username, 
      role: req.user.role 
    });
    const fakeToken = `header.${Buffer.from(payload).toString('base64url')}.signature`;
    
    const ALL_PROJECTS = ['PRJ01_G04', 'PRJ02_G04', 'PRJ03_G04', 'PRJ04_G04', 'PRJ05_G04'];
    
    for (const projId of ALL_PROJECTS) {
      try {
        const auth = await fastify.grpcClient.AuthorizeQuery({ 
          token_jwt: fakeToken, 
          query_type: 'ResumoCoorte', 
          target_id: projId 
        });
        if (auth.status === 'ALLOW') {
          return { projectId: projId };
        }
      } catch (err) {
      }
    }
    return reply.code(404).send({ error: "Nenhum projeto encontrado para este pesquisador" });
  });

  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params;

    const response = await fastify.grpcClient.FetchClinicalEvents({ 
      patient_id: id 
    });
    return response.events;
  });

  fastify.get('/:id/encounters', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id } = req.params;
    
    const response = await fastify.grpcClient.FetchEncounters({ 
      patient_id: id 
    });
    return response.encounters;
  });

  fastify.get('/cohorts/:projectId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { projectId } = req.params;
    
    const response = await fastify.grpcClient.FetchCohortData({ 
      project_id: projectId 
    });
    return response;
  });

  fastify.get('/statistics/:projectId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { projectId } = req.params;

    const response = await fastify.grpcClient.GetCohortStatistics({ 
      project_id: projectId 
    });
    return response; 
  });
}