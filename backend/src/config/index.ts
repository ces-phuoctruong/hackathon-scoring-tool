import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-scoring',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
