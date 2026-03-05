import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  const dbInfo = env.databaseUrl?.split('@')[1] || 'connected';
  console.log(`API Server running on http://localhost:${env.port}`);
  console.log(`Database: ${dbInfo}`);
  console.log(`Groq AI: ${env.groqApiKey ? 'configured' : 'not set'}`);
});
