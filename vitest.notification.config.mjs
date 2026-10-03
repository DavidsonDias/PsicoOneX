import path from 'node:path';

// Service-only tests need neither the React compiler nor a browser environment.
export default {
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['src/services/notification.service.test.ts'],
  },
};
