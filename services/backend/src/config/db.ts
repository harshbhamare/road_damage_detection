import mongoose from 'mongoose';

export async function connectDatabase(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    console.log('[Database] Successfully connected to MongoDB');
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection lost. Reconnecting...');
});
