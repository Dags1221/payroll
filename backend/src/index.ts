import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRouter from './routes/api.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

// Production Security Sanity Checks
if (process.env.NODE_ENV === 'production') {
  const missingSecrets: string[] = [];
  const hasJwtSecret = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '' && !process.env.JWT_SECRET.includes('change-me'));
  const hasAppSecret = Boolean(process.env.APP_SECRET && process.env.APP_SECRET.trim() !== '' && !process.env.APP_SECRET.includes('change-me'));
  const hasExplicitQrSecret = Boolean((process.env.QR_HMAC_SECRET || process.env.QR_SECRET) && !process.env.QR_HMAC_SECRET?.includes('change-me'));

  if (!hasJwtSecret && !hasAppSecret) {
    missingSecrets.push('JWT_SECRET (or APP_SECRET)');
  }
  if (!hasExplicitQrSecret && !hasJwtSecret && !hasAppSecret) {
    missingSecrets.push('QR_HMAC_SECRET');
  }

  if (missingSecrets.length > 0) {
    console.error('\n================================================================');
    console.error('❌ FATAL PRODUCTION SECURITY ERROR: Missing required secrets:');
    missingSecrets.forEach(s => console.error(`   - ${s}`));
    console.error('The application cannot start in production mode without securely');
    console.error('configured, non-default cryptographic secret keys.');
    console.error('================================================================\n');
    process.exit(1);
  } else if (!hasExplicitQrSecret) {
    console.log('ℹ️ [Security] QR_HMAC_SECRET not explicitly set; securely deriving key from master JWT_SECRET.');
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all local dev and Vercel preview/production origins
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Enterprise Attendance & Payroll API'
  });
});

// Mount API router
app.use('/api', apiRouter);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.url} was not found on this server.`
    }
  });
});

// Centralized error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Enterprise Attendance & Payroll Management System API`);
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);
});

export default app;
