export default async function (fastify, opts) {
  fastify.post('/fhir', async (req, reply) => {
    const dadosBrutos = req.body;
    // Chamar gRPC: client.TransformToFhir({ dados: dadosBrutos })
    return { status: "convertido", data: "fhir-format-result" };
  });
}