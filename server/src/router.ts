import path from 'node:path';

import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { FastifySSEPlugin } from 'fastify-sse-v2';

import gameController from './controllers/game-controller';

export default async function router(fastify: FastifyInstance) {
  fastify.register(fastifyWebsocket);
  fastify.register(FastifySSEPlugin);
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../static'),
    prefix: '/',
  });
  fastify.get('/', (_request, reply) => reply.redirect(301, '/game.html'));
  fastify.register(gameController, { prefix: '/game' });
}
