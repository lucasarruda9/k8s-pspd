export default async function (fastify, opts) {
  fastify.post('/login', async (req, reply) => {
    // Aqui você chamará o gRPC de Autenticação (AuthService)
    return { token: "fake-jwt-token", user: "Dr. João" };
  });
}