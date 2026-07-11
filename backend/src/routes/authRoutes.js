export default async function (fastify, opts) {
  
  fastify.post('/authorize', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { query_type, target_id } = req.body;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return reply.status(401).send({ message: 'Token JWT ausente' });
    }

    const authDecision = await fastify.grpcClient.AuthorizeQuery({
      token_jwt: token,
      query_type,
      target_id
    });

    return authDecision;
  });
}