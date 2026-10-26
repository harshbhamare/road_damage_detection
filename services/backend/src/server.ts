import dotenv from 'dotenv';
import path from 'path';
import { createApp } from './app';
import { connectDatabase } from './config/db';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/road_damage_db';

async function bootstrap() {
  try {
    await connectDatabase(MONGODB_URI);

    const app = createApp();
    app.listen(PORT, () => {
      console.log(`[Backend Service] Listening on http://localhost:${PORT}`);
      console.log(`[Backend Service] Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('[Backend Service] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
