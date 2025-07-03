const App = require('./app');

const app = new App();
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
