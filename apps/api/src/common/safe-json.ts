const BLOCKED_KEYS=new Set(['__proto__','prototype','constructor']);
export type JsonSafetyOptions={maxDepth?:number;maxKeys?:number;maxArrayLength?:number;maxStringLength?:number};

export function assertSafeJson(value:unknown,options:JsonSafetyOptions={}):void{
  const maxDepth=options.maxDepth??24;
  const maxKeys=options.maxKeys??12_000;
  const maxArrayLength=options.maxArrayLength??10_000;
  const maxStringLength=options.maxStringLength??1_000_000;
  let keys=0;
  const seen=new Set<object>();
  const visit=(node:unknown,depth:number)=>{
    if(depth>maxDepth)throw new Error('JSON body is too deeply nested');
    if(typeof node==='string'&&node.length>maxStringLength)throw new Error('JSON string is too large');
    if(node===null||typeof node!=='object')return;
    if(seen.has(node as object))throw new Error('JSON body contains a circular reference');
    seen.add(node as object);
    if(Array.isArray(node)){
      if(node.length>maxArrayLength)throw new Error('JSON array is too large');
      for(const item of node)visit(item,depth+1);
    }else{
      for(const [key,item] of Object.entries(node as Record<string,unknown>)){
        if(BLOCKED_KEYS.has(key))throw new Error('Unsafe JSON key');
        keys+=1;if(keys>maxKeys)throw new Error('JSON body contains too many fields');
        visit(item,depth+1);
      }
    }
    seen.delete(node as object);
  };
  visit(value,0);
}
