/** Structured production timing. No cookies, URLs, credentials, or payload values. */
export function ticartiPerfMeasure(stage:string,durationMs:number,detail:Record<string,string|number|boolean>={}){
  const threshold=Number(process.env.TICARTI_STOREFRONT_TIMING_SLOW_MS||500);
  if(process.env.TICARTI_STOREFRONT_TIMING!=='1' && durationMs< (Number.isFinite(threshold)?Math.max(threshold,0):500))return;
  const {store:_store,...safe}=detail;
  // Store key excluded so custom-domain / tenant identifiers do not enter logs.
  console.info(JSON.stringify({component:'ticarti-storefront',event:'server_timing',stage,durationMs:Math.round(durationMs),...safe}));
}
