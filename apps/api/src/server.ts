import './env.js';
import Fastify from 'fastify';
import { PRODUCTIVITY_CLASSIFICATIONS, type ActivityStatus } from '@currentstate/shared';

export function buildApp() {
  const app = Fastify({
    logger: false,
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/v1/meta', async () => ({
    app: 'CurrentState',
    phase: 'foundation',
    status: 'ready',
    supportedClassifications: PRODUCTIVITY_CLASSIFICATIONS,
    supportedStates: ['PENDING', 'RUNNING', 'COMPLETED'] satisfies ActivityStatus[],
  }));

  return app;
}

const app = buildApp();

if (process.env.NODE_ENV !== 'test') {
  const start = async () => {
    await app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
  };

  start().catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export default app;
