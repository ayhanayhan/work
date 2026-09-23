import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    const customer = String(process.env.JWT_SECRET || '');
    const merchant = String(process.env.MERCHANT_JWT_SECRET || '');
    const superadmin = String(process.env.SUPERADMIN_JWT_SECRET || '');
    if (customer.length < 48) throw new Error('JWT_SECRET must be configured with at least 48 characters in production');
    if (merchant.length < 48) throw new Error('MERCHANT_JWT_SECRET must be configured with at least 48 characters in production');
    if (superadmin.length < 48) throw new Error('SUPERADMIN_JWT_SECRET must be configured with at least 48 characters in production');
    if (new Set([customer, merchant, superadmin]).size !== 3) throw new Error('Customer, merchant and superadmin JWT secrets must be different');
  }
  const app = await NestFactory.create(AppModule, { cors: false });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  const origins = String(process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002').split(',').map(x => x.trim()).filter(Boolean);
  app.enableCors({ origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (origins.includes(origin)) return callback(null, true);
    try { const url = new URL(origin); if (url.protocol === 'https:' && (url.hostname === 'ticarti.com' || url.hostname.endsWith('.ticarti.com'))) return callback(null, true); } catch {}
    return callback(new Error('Origin not allowed by CORS'), false);
  }, credentials: true, methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Tenant-Id','X-Store-Id','X-Auth-Client'] });
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy','same-origin');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }));
  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`Commerce API listening on http://localhost:${port}/v1`);
}
bootstrap();
