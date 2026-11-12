export type ThemeBudgetReport = {
  ok: boolean;
  serializedBytes: number;
  nodeCount: number;
  maxDepth: number;
  sections: number;
  templates: number;
  groups: number;
  externalAssets: number;
  violations: string[];
};

const LIMITS = {
  serializedBytes: 900_000,
  nodeCount: 3_000,
  maxDepth: 14,
  sections: 240,
  templates: 120,
  groups: 60,
  externalAssets: 40,
};

function walk(value:any, depth:number, state:{nodes:number;maxDepth:number;urls:Set<string>}){
  state.nodes++;
  state.maxDepth=Math.max(state.maxDepth,depth);
  if(state.nodes>LIMITS.nodeCount*2)return;
  if(typeof value==='string'){
    const re=/https?:\/\/[^\s"'<>]+/g;
    for(const m of value.match(re)||[])state.urls.add(m);
    return;
  }
  if(Array.isArray(value)){for(const item of value)walk(item,depth+1,state);return;}
  if(value&&typeof value==='object'){for(const v of Object.values(value))walk(v,depth+1,state);}
}

export function analyzeThemePerformanceBudget(input:{config?:any;runtime?:any;sections?:any[]}):ThemeBudgetReport{
  const payload={config:input.config||{},runtime:input.runtime||{},sections:Array.isArray(input.sections)?input.sections:[]};
  const serializedBytes=Buffer.byteLength(JSON.stringify(payload),'utf8');
  const state={nodes:0,maxDepth:0,urls:new Set<string>()};
  walk(payload,0,state);
  const templates=input.runtime?.templates&&typeof input.runtime.templates==='object'?Object.keys(input.runtime.templates).length:0;
  const groups=input.runtime?.groups&&typeof input.runtime.groups==='object'?Object.keys(input.runtime.groups).length:0;
  const sections=Array.isArray(input.sections)?input.sections.length:0;
  const violations:string[]=[];
  if(serializedBytes>LIMITS.serializedBytes)violations.push(`Tema runtime boyutu ${serializedBytes} byte; limit ${LIMITS.serializedBytes}.`);
  if(state.nodes>LIMITS.nodeCount)violations.push(`Tema node sayısı ${state.nodes}; limit ${LIMITS.nodeCount}.`);
  if(state.maxDepth>LIMITS.maxDepth)violations.push(`Tema veri derinliği ${state.maxDepth}; limit ${LIMITS.maxDepth}.`);
  if(sections>LIMITS.sections)violations.push(`Section sayısı ${sections}; limit ${LIMITS.sections}.`);
  if(templates>LIMITS.templates)violations.push(`Template sayısı ${templates}; limit ${LIMITS.templates}.`);
  if(groups>LIMITS.groups)violations.push(`Group sayısı ${groups}; limit ${LIMITS.groups}.`);
  if(state.urls.size>LIMITS.externalAssets)violations.push(`Harici asset sayısı ${state.urls.size}; limit ${LIMITS.externalAssets}.`);
  return{ok:violations.length===0,serializedBytes,nodeCount:state.nodes,maxDepth:state.maxDepth,sections,templates,groups,externalAssets:state.urls.size,violations};
}

export function assertThemePerformanceBudget(input:{config?:any;runtime?:any;sections?:any[]}):ThemeBudgetReport{
  const report=analyzeThemePerformanceBudget(input);
  if(!report.ok)throw new Error(`Theme performance budget exceeded: ${report.violations.join(' ')}`);
  return report;
}
