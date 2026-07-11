export default async function (fastify, opts) {
  
  fastify.post('/authorize', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { query_type, target_id } = req.body;
    const token = req.headers.authorization.split(' ')[1];

    const authDecision = await fastify.grpcClient.AuthorizeQuery({
      token_jwt: token,
      query_type,
      target_id
    });

    return authDecision;
  });
}