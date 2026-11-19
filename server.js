import { createToolboxServer } from './src/server.js';

const server = createToolboxServer();
server.listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => {
  console.log('Toolbox is running at http://127.0.0.1:' + server.address().port);
});
server.on('error', error => {
  console.error('Toolbox could not start:', error.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(() => process.exit());
    server.closeAllConnections();
  });
}
