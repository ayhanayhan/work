import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
const { Client }=pg;
const url=process.env.DATABASE_URL||'';
if(process.env.TICARTI_ISOLATED_DB_E2E!=='YES') throw Error('TICARTI_ISOLATED_DB_E2E=YES required');
if(!url.includes('commerce-db-loadtest')) throw Error('Only commerce-db-loadtest allowed (no override)');
const dbname=decodeURIComponent(new URL(url).pathname).replace(/^\//,'');
if(dbname!=='commerce') throw Error('Only commerce database is allowed');
const schema='ticarti_race_'+randomBytes(6).toString('hex');
const clients=[];
const connect=async()=>{const c=new Client({connectionString:url});await c.connect();clients.push(c);return c;};
const main=await connect();let created=false;let passed=0;
const workers=await Promise.all(Array.from({length:12},connect));
async function tx(client,fun){await client.query('BEGIN');try{const result=await fun(client);await client.query('COMMIT');return result;}catch(err){await client.query('ROLLBACK');throw err;}}
async function check(name,fn){await fn();passed++;console.log('PASS '+name)}
try {
 await main.query(`CREATE SCHEMA "${schema}"`);created=true;
 await main.query(`CREATE TABLE "${schema}".carts (id text PRIMARY KEY,status text NOT NULL)`);
 await main.query(`CREATE TABLE "${schema}".sessions (id text PRIMARY KEY,cart_id text NOT NULL,status text NOT NULL)`);
 await main.query(`INSERT INTO "${schema}".carts VALUES ('cart-1','active')`);
 await check('12 concurrent checkout sessions -> exactly one OPEN and one ID',async()=>{
  const ids=await Promise.all(workers.map((w,i)=>tx(w,async c=>{
   await c.query(`SELECT pg_advisory_xact_lock(hashtextextended('cart-1',0))`);
   const r=await c.query(`SELECT id FROM "${schema}".sessions WHERE cart_id='cart-1' AND status='OPEN' LIMIT 1`);
   if(r.rows.length) return r.rows[0].id;
   const id=`s-${i}`;
   await c.query(`INSERT INTO "${schema}".sessions VALUES ($1,'cart-1','OPEN')`,[id]);return id;
  })));
  assert.equal(new Set(ids).size,1);
  const r=await main.query(`SELECT count(*)::int AS n FROM "${schema}".sessions WHERE status='OPEN'`);assert.equal(r.rows[0].n,1);
 });
 await main.query(`CREATE TABLE "${schema}".stock (id int PRIMARY KEY,reserved int NOT NULL CHECK (reserved>=0))`);
 await main.query(`INSERT INTO "${schema}".stock VALUES (1,1)`);
 await check('12 concurrent inventory CAS claims -> one winner',async()=>{
  const counts=await Promise.all(workers.map(async c=>(await c.query(`UPDATE "${schema}".stock SET reserved=reserved-1 WHERE id=1 AND reserved>=1 RETURNING id`)).rowCount));
  assert.equal(counts.reduce((a,b)=>a+b,0),1);
  const r=await main.query(`SELECT reserved FROM "${schema}".stock WHERE id=1`);assert.equal(r.rows[0].reserved,0);
 });
 await main.query(`CREATE TABLE "${schema}".payments (id int PRIMARY KEY, captured integer NOT NULL, refunded integer NOT NULL DEFAULT 0)`);
 await main.query(`INSERT INTO "${schema}".payments VALUES (1,10000,0)`);
 await check('12 concurrent 1500 refunds -> 6 accepted and never over captured',async()=>{
  const accepted=await Promise.all(workers.map(w=>tx(w,async c=>{
    const {rows}=await c.query(`SELECT captured,refunded FROM "${schema}".payments WHERE id=1 FOR UPDATE`);
    if(rows[0].refunded+1500>rows[0].captured)return false;
    await c.query(`UPDATE "${schema}".payments SET refunded=refunded+1500 WHERE id=1`);return true;
  })));
  assert.equal(accepted.filter(Boolean).length,6);
  const r=await main.query(`SELECT refunded FROM "${schema}".payments WHERE id=1`);assert.equal(r.rows[0].refunded,9000);
 });
 await main.query(`CREATE TABLE "${schema}".orders (id int PRIMARY KEY, state text NOT NULL, commit_count integer NOT NULL DEFAULT 0)`);
 await main.query(`INSERT INTO "${schema}".orders VALUES (1,'PENDING',0)`);
 await check('12 concurrent paid callbacks -> one order settlement',async()=>{
  const outcomes=await Promise.all(workers.map(w=>tx(w,async c=>{
    const {rows}=await c.query(`SELECT state FROM "${schema}".orders WHERE id=1 FOR UPDATE`);
    if(rows[0].state==='PAID') return false;
    await c.query(`UPDATE "${schema}".orders SET state='PAID',commit_count=commit_count+1 WHERE id=1`);return true;
  })));
  assert.equal(outcomes.filter(Boolean).length,1);
  const r=await main.query(`SELECT commit_count FROM "${schema}".orders WHERE id=1`);assert.equal(r.rows[0].commit_count,1);
 });
 console.log(`RESULT: ${passed}/4 PASS — PostgreSQL concurrency primitives; NOT full application service E2E`);
} finally {
 if(created) {try{await main.query(`DROP SCHEMA "${schema}" CASCADE`);console.log('PASS temporary schema removed')}catch(err){console.error('CRITICAL: schema cleanup failed:',schema,err.message);process.exitCode=1}}
 await Promise.all(clients.map(c=>c.end().catch(()=>{})));
}
