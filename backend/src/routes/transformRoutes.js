export default async function (fastify, opts) {

  fastify.get('/statistics/:projectId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { projectId } = req.params;
    
    // Chama o serviço de transformação
    const response = await fastify.grpcClient.GetCohortStatistics({ 
      project_id: projectId 
    });
    return response;
  });

  fastify.post('/transform-fhir', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { access_level, raw_patients, raw_encounters, raw_events } = req.body;
    
    const response = await fastify.grpcClient.TransformToFHIR({ 
      access_level,
      raw_patients,
      raw_encounters,
      raw_events
    });
    return response;
  });
}