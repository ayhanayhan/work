export function canonicalFromOrder(order:any,store:any,opt:any={}){
 const items=(order.items||[]).map((x:any)=>({sku:x.sku||x.variantSku||'',name:x.title||x.name||'',quantity:Number(x.quantity||1),unitPrice:Number(x.unitPrice||x.price||0),taxRate:Number(x.taxRate||0),total:Number(x.total||Number(x.unitPrice||x.price||0)*Number(x.quantity||1))}));
 const gross=Number(order.grandTotal||order.total||0),tax=Number(order.taxTotal||0),net=Math.max(0,gross-tax);
 return{localReferenceId:String(opt.localReferenceId||order.number||order.id),issueDate:new Date().toISOString(),currency:order.currency||store?.currency||'TRY',documentType:opt.documentType,scenario:opt.scenario,invoiceTypeCode:opt.invoiceTypeCode||'SATIS',billingReference:opt.billingReference||null,seller:{name:store?.name||'',taxNumber:store?.taxNumber||null},buyer:order.billingAddress||order.shippingAddress||{},items,totals:{net,tax,gross}};
}
