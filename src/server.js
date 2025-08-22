// server.js
import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/perfil.routes.js';
import projectsRoutes from './routes/projects.routes.js'

dotenv.config();

const api = Fastify({
  logger: true,
  ignoreTrailingSlash: true, // evita 405 por /rota/ vs /rota
});

// CORS (o plugin já responde OPTIONS/preflight)
await api.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // preflight continua habilitado por padrão
});

// favicon silencioso
api.get('/favicon.ico', (_req, reply) => reply.code(204).send());

// Handlers padrão em JSON
api.setNotFoundHandler((req, rep) => {
  rep.code(404).send({ error: 'Rota não encontrada' });
});
api.setErrorHandler((err, req, rep) => {
  req.log.error(err);
  rep.code(err.statusCode || 500).send({ error: err.message || 'Erro interno' });
});

// Healthcheck
api.get('/', (_req, reply) => {
  reply.send({ status: 'Servidor ON' });
});

// Rotas
await api.register(authRoutes);  
await api.register(usersRoutes); 
await api.register(projectsRoutes);

const PORT = process.env.PORT || 3333;
const start = async () => {
  try {
    await api.listen({ port: PORT, host: '0.0.0.0' });
    api.log.info(`Servidor rodando na porta ${PORT}`);
    api.log.info('✅ CORS ok (preflight OPTIONS via plugin).');
  } catch (err) {
    api.log.error(err);
    process.exit(1);
  }
};
start();
