import app from './app';

const FASTIFY_PORT = Number(process.env.PORT) || 3006;

app.listen({ host: '0.0.0.0', port: FASTIFY_PORT });

console.log(
  `🚀  Fastify server running on port http://localhost:${FASTIFY_PORT}`,
);
console.log(`Route index: /`);
console.log(`Route game: /game`);
