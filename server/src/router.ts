import path from 'node:path';

import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

import gameController from './controllers/game-controller';

export default async function router(fastify: FastifyInstance) {
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../static'),
    prefix: '/',
  });
  fastify.register(gameController, { prefix: '/game' });
}
