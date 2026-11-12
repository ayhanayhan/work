export type StockCandidate = {
  warehouseId: string;
  available: number;
  priority?: number | null;
  isDefault?: boolean | null;
  distanceKm?: number | null;
  unitCost?: number | null;
};

export type RoutingPolicy = 'SINGLE_WAREHOUSE' | 'STRICT_SINGLE_WAREHOUSE' | 'PRIORITY' | 'NEAREST' | 'COST_OPTIMIZED' | 'TRANSFER_TO_PRIMARY';

export type RoutingDecision = {
  warehouseId: string;
  quantity: number;
  reason: string;
};

function priorityScore(row: StockCandidate) { return Number(row.priority ?? 100); }
function defaultTie(row: StockCandidate) { return row.isDefault ? -1 : 0; }


export function routeInventory(candidates: StockCandidate[], quantity: number, policy: RoutingPolicy, splitAllowed: boolean): RoutingDecision[] {
  const need = Math.max(0, Math.floor(Number(quantity || 0)));
  if (!need) return [];
  const rows = candidates.filter((x) => Number(x.available) > 0).map((x) => ({...x, available: Math.max(0, Math.floor(Number(x.available)))}));
  if (!rows.length) return [];

  const sorted = [...rows].sort((a,b) => {
    if (policy === 'NEAREST') return Number(a.distanceKm ?? Number.MAX_SAFE_INTEGER) - Number(b.distanceKm ?? Number.MAX_SAFE_INTEGER) || priorityScore(a)-priorityScore(b) || defaultTie(a)-defaultTie(b) || b.available-a.available;
    if (policy === 'COST_OPTIMIZED') return Number(a.unitCost ?? Number.MAX_SAFE_INTEGER) - Number(b.unitCost ?? Number.MAX_SAFE_INTEGER) || priorityScore(a)-priorityScore(b) || b.available-a.available;
    if (policy === 'PRIORITY' || policy === 'TRANSFER_TO_PRIMARY') return priorityScore(a)-priorityScore(b) || defaultTie(a)-defaultTie(b) || b.available-a.available;
    return b.available-a.available || defaultTie(a)-defaultTie(b) || priorityScore(a)-priorityScore(b);
  });

  const single = sorted.find((x) => x.available >= need);
  if (single) return [{warehouseId:single.warehouseId,quantity:need,reason:`${policy}:single`}];
  if (!splitAllowed) return [];

  let remaining=need;
  const out:RoutingDecision[]=[];
  for (const row of sorted) {
    if (remaining<=0) break;
    const take=Math.min(remaining,row.available);
    if (take>0) out.push({warehouseId:row.warehouseId,quantity:take,reason:`${policy}:split`});
    remaining-=take;
  }
  return remaining>0?[]:out;
}
