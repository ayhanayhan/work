#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
const args=new Set(process.argv.slice(2));
const apply=args.has('--apply');
const project=process.env.GCP_PROJECT_ID||'wedidit-64fae';
const region=process.env.GCP_REGION||'europe-west1';
const standard=Number(process.env.CAPACITY_STANDARD_CELLS||4);
const hv=Number(process.env.CAPACITY_HV_CELLS||5);
const commands=[];
const q=s=>String(s);
for(let i=1;i<=standard;i++){
 const sql=`ticarti-standard-${i}`;const redis=`ticarti-standard-${i}`;
 commands.push(['gcloud',['sql','instances','create',sql,'--project',project,'--region',region,'--database-version=POSTGRES_15','--cpu=4','--memory=15360MiB','--storage-type=SSD','--storage-size=100','--availability-type=regional']]);
 commands.push(['gcloud',['sql','databases','create','commerce','--instance',sql,'--project',project]]);
 commands.push(['gcloud',['redis','instances','create',redis,'--project',project,'--region',region,'--size=5','--redis-version=redis_7_2','--tier=standard']]);
}
for(let i=1;i<=hv;i++){
 const sql=`ticarti-hv-${i}`;const redis=`ticarti-hv-${i}`;
 commands.push(['gcloud',['sql','instances','create',sql,'--project',project,'--region',region,'--database-version=POSTGRES_15','--cpu=8','--memory=30720MiB','--storage-type=SSD','--storage-size=250','--availability-type=regional']]);
 commands.push(['gcloud',['sql','databases','create','commerce','--instance',sql,'--project',project]]);
 commands.push(['gcloud',['redis','instances','create',redis,'--project',project,'--region',region,'--size=10','--redis-version=redis_7_2','--tier=standard']]);
}
console.log(`# project=${project} region=${region} mode=${apply?'APPLY':'DRY-RUN'}`);
for(const [bin,a] of commands){console.log([bin,...a].map(q).join(' '));if(apply)execFileSync(bin,a,{stdio:'inherit'});}
if(!apply)console.log('\nDry-run only. Review capacity/costs and rerun with --apply to create resources.');
