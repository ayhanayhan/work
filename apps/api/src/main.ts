import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionI18nFilter } from './i18n/api-exception-i18n.filter';
import { runWithApiLocale } from './i18n/api-i18n';
import {assertSafeJson} from './common/safe-json';
import {randomUUID} from 'crypto';
const expressText = require('express').text as (options:object)=>any;
const expressJson = require('express').json as (options:object)=>any;
const expressUrlencoded = require('express').urlencoded as (options:object)=>any;

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    const customer = String(process.env.JWT_SECRET || '');
    const merchant = String(process.env.MERCHANT_JWT_SECRET || '');
    const superadmin = String(process.env.SUPERADMIN_JWT_SECRET || '');
    if (customer.length < 48) throw new Error('JWT_SECRET must be configured with at least 48 characters in production');
    if (merchant.length < 48) throw new Error('MERCHANT_JWT_SECRET must be configured with at least 48 characters in production');
    if (superadmin.length < 48) throw new Error('SUPERADMIN_JWT_SECRET must be configured with at least 48 characters in production');
    if (new Set([customer, merchant, superadmin]).size !== 3) throw new Error('Customer, merchant and superadmin JWT secrets must be different');
    const developer = String(process.env.DEVELOPER_JWT_SECRET || '');
    const integrationKey = String(process.env.INTEGRATION_ENCRYPTION_KEY || '');
    const workerToken = String(process.env.EVENT_WORKER_TOKEN || '');
    for (const [name, value, minimum] of [['DEVELOPER_JWT_SECRET', developer, 48], ['INTEGRATION_ENCRYPTION_KEY', integrationKey, 32], ['EVENT_WORKER_TOKEN', workerToken, 32]] as const) {
      if (value.length < minimum || /replace|placeholder|change.me|development.only|example/i.test(value)) throw new Error(`${name} must be a non-placeholder secret of at least ${minimum} characters in production`);
    }
    if ([customer, merchant, superadmin].includes(developer)) throw new Error('DEVELOPER_JWT_SECRET must be different from customer, merchant and superadmin JWT secrets');
  }
  const app = await NestFactory.create(AppModule, { cors: false, bodyParser: false });
  app.use('/v1/payment-providers/stripe/webhook', expressText({type:'application/json',limit:'1mb'}));
  app.enableShutdownHooks();
  if(process.env.TRUST_PROXY_HEADERS==='true'){
    const hops=Math.max(1,Math.min(3,Number(process.env.TRUST_PROXY_HOPS||1)||1));
    // Trust only the configured number of platform/reverse-proxy hops. This makes req.ip usable
    // without ever trusting an arbitrary client-supplied forwarding header directly.
    app.getHttpAdapter().getInstance().set('trust proxy',hops);
  }
  app.use('/v1/email/sns',expressText({type:'text/plain',limit:'256kb'}));
  app.use((req:any,res:any,next:any)=>{const len=Number(req.headers?.['content-length']||0);if(req.method==='POST'&&/\/v1\/storefront\/[^/]+\/theme\/render(?:\?|$)/.test(String(req.url||''))&&len>512*1024)return res.status(413).json({statusCode:413,message:'Theme preview payload is too large'});next();});
  app.use(expressJson({limit:'16mb'}));
  app.use(expressUrlencoded({extended:true,limit:'16mb'}));
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((req:any,res:any,next:any)=>{const incoming=String(req.headers?.['x-request-id']||'').trim();const requestId=/^[A-Za-z0-9._:-]{8,128}$/.test(incoming)?incoming:randomUUID();req.requestId=requestId;res.setHeader('X-Request-Id',requestId);next()});
  // Runtime protection also covers legacy endpoints that still accept flexible payloads while
  // their domain DTOs are being tightened. ValidationPipe remains the field-level validator.
  app.use((req:any,res:any,next:any)=>{try{if(req.body!==undefined)assertSafeJson(req.body);next()}catch(e){res.status(400).json({statusCode:400,message:e instanceof Error?e.message:'Invalid request body',error:'Bad Request'})}});
  const origins = String(process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://localhost:3001,http://localhost:3002')).split(',').map(x => x.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && (!origins.length || origins.some(x => x === '*' || !x.startsWith('https://')))) throw new Error('Production CORS requires explicit HTTPS origins');
  app.enableCors({ origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (origins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'), false);
  }, credentials: true, methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Tenant-Id','X-Store-Id','X-Auth-Client'] });
  app.use((req: any, _res: any, next: any) => runWithApiLocale(req.headers?.['accept-language'], next));
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
  app.useGlobalFilters(new ApiExceptionI18nFilter());
  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`Commerce API listening on http://localhost:${port}/v1`);
}
bootstrap();
