const mongoose = require('mongoose');

let memoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sankshepai';

  try {
    // Attempt connecting to configured URI
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[MongoDB] External connection to ${uri} failed (${err.message}).`);
    console.log('[MongoDB] Starting zero-config embedded MongoDB instance via mongodb-memory-server...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        binary: {
          version: '4.4.29',
        },
      });
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[MongoDB] Embedded in-memory MongoDB started at: ${memUri}`);
      return conn;
    } catch (memErr) {
      console.error('[MongoDB] Critical Error: Failed to start embedded MongoDB:', memErr.message);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
