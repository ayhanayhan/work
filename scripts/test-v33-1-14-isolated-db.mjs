const assert=require('node:assert/strict');const {Client}=require('pg');const crypto=require('node:crypto');
const url=process.env.DATABASE_URL||'';
if(process.env.TICARTI_ISOLATED_DB_E2E!=='YES')throw Error('Set TICARTI_ISOLATED_DB_E2E=YES');
if(!url.includes('commerce-db-loadtest')&&!process.env.TICARTI_LOCAL_E2E_OVERRIDE)throw Error('Database target must explicitly contain commerce-db-loadtest; no production');
const schema='ticarti_conc_'+crypto.randomBytes(6).toString('hex');
const clients=[];
const connect=async()=>{const c=new Client({connectionString:url});await c.connect();clients.push(c);return c};
const setup=await connect();
try{
 await setup.query(`CREATE SCHEMA "${schema}"`);
 await setup.query(`CREATE TABLE "${schema}".orders(id int PRIMARY KEY, refunds int NOT NULL DEFAULT 0, amount int NOT NULL)`);
 await setup.query(`INSERT INTO "${schema}".orders VALUES (1,0,10000)`);
 const workers=await Promise.all(Array.from({length:12},connect));
 const outcomes=await Promise.all(workers.map(async (db,i)=>{
  await db.query('BEGIN');
  try{
   const {rows}=await db.query(`SELECT refunds,amount FROM "${schema}".orders WHERE id=1 FOR UPDATE`);
   const allowed=rows[0].refunds+1500<=rows[0].amount;
   if(allowed)await db.query(`UPDATE "${schema}".orders SET refunds=refunds+1500 WHERE id=1`);
   await db.query('COMMIT');return allowed;
  }catch(e){await db.query('ROLLBACK');throw e;}
 }));
 const result=await setup.query(`SELECT refunds,amount FROM "${schema}".orders WHERE id=1`);
 assert.equal(outcomes.filter(Boolean).length,6);
 assert.equal(result.rows[0].refunds,9000);
 console.log('PASS: 12 concurrent refund reservations limited to 6 x 1500 by database row lock');
 await setup.query(`CREATE TABLE "${schema}".stocks(id int PRIMARY KEY, reserved int NOT NULL)`);
 await setup.query(`INSERT INTO "${schema}".stocks VALUES (1,1)`);
 const settled=await Promise.all(workers.map(async db=>{
  const r=await db.query(`UPDATE "${schema}".stocks SET reserved=reserved-1 WHERE id=1 AND reserved>=1 RETURNING id`);
  return r.rowCount;
 }));
 assert.equal(settled.reduce((a,b)=>a+b,0),1);
 console.log('PASS: 12 concurrent stock CAS decrements produce one winner');
 console.log('NOTE: isolated SQL primitive checks only; application checkout/refund/stock E2E not proven');
}finally{
 try{await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)}catch(e){console.error('CLEANUP ERROR',e.message)}
 await Promise.all(clients.map(c=>c.end().catch(()=>{})));
}
