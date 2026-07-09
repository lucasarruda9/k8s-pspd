export default async function (fastify, opts) {
  
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { username, role } = req.user; 
    
    const response = await fastify.grpcClient.FetchPatients({ 
      username, 
      role 
    });
    return response.patients;
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