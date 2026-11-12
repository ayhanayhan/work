import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {createServer} from 'node:http';

async function bootstrap(){
  process.env.BACKGROUND_WORKER_ENABLED='true';
  const app=await NestFactory.createApplicationContext(AppModule,{logger:['log','warn','error']});
  const port=Math.max(1,Number(process.env.PORT||8080)||8080);
  const server=createServer((req,res)=>{if(req.url==='/health'||req.url==='/'){res.statusCode=200;res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,role:'worker',cell:process.env.TICARTI_CELL_CODE||'primary'}));return}res.statusCode=404;res.end('not found')});
  await new Promise<void>(resolve=>server.listen(port,'0.0.0.0',resolve));
  const shutdown=async()=>{server.close();await app.close();process.exit(0)};
  process.once('SIGTERM',()=>void shutdown());
  process.once('SIGINT',()=>void shutdown());
  console.log('Ticarti background worker started');
}
void bootstrap();
