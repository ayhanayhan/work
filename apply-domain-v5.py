from pathlib import Path
root=Path(__file__).resolve().parent
service=root/'apps/api/src/merchant/merchant.service.ts'
controller=root/'apps/api/src/merchant/merchant.controller.ts'
ui=root/'apps/admin/app/(protected)/settings/domains/page.tsx'
s=service.read_text(); c=controller.read_text(); p=ui.read_text()
needle='  async syncCloudflareDomain(tenantId:string,storeId:string){'
if needle not in s: raise SystemExit('API domain methods missing: apply v2/v3 first')
if 'async deleteCustomDomain(' not in s:
 method='''  async deleteCustomDomain(tenantId:string,storeId:string){
    const store=await this.assertStore(tenantId,storeId);
    if(!store.domain)return this.domainSettings(tenantId,storeId);
    const settings:any=store.settings||{};
    const cfg:any=settings.domains||{};
    const result=await this.prisma.tenant.updateMany({
      where:{id:storeId,domain:store.domain},
      data:{domain:null,settings:{...settings,domains:{...cfg,mode:'subdomain'}}}
    });
    if(result.count!==1)throw new BadRequestException('Domain değişti. Sayfayı yenileyip tekrar deneyin.');
    await this.cache.delPattern('public:site:*');
    await this.cache.purgeTenant(tenantId);
    const confirmed=await this.prisma.tenant.findUnique({where:{id:storeId},select:{domain:true}});
    if(confirmed?.domain)throw new BadRequestException('Domain kaldırılamadı. Lütfen tekrar deneyin.');
    return this.domainSettings(tenantId,storeId);
  }

'''
 s=s.replace(needle,method+needle,1)
route="  @Patch('store-settings/:id/domain') domainUpdate"
if route not in c: raise SystemExit('API controller domain route missing')
if "@Delete('store-settings/:id/domain')" not in c:
 at=c.index('  @RequirePermission(\'settings.manage\')\n'+route)
 c=c[:at]+"  @RequirePermission('settings.manage')\n  @Delete('store-settings/:id/domain') domainDelete(@CurrentTenant() t:string,@Param('id') id:string){return this.svc.deleteCustomDomain(t,id);}\n"+c[at:]
# The existing UI can receive a 200 response while the domain is still set; require a confirmed readback.
start=p.index(' const removeDomain=()=>{')
end=p.index('\n const saveCloudflare=',start)
replacement=""" const removeDomain=()=>{if(!data?.domain)return;const old=data.domain;if(!window.confirm(`${old} domain bağlantısını mağazadan kaldırmak istiyor musunuz? Cloudflare DNS kayıtları otomatik silinmez.`))return;run('remove',async()=>{const deleted:DomainData=await call('domain','DELETE');if(deleted.domain)throw new Error('API domain bağlantısını kaldıramadı.');const confirmed=await load();if(confirmed?.domain)throw new Error('Domain hâlâ kayıtlı. API sürümünü ve veritabanını kontrol edin.');setData(confirmed||deleted);setCandidate('');setNotice('Özel domain kaldırıldı. DNS kayıtları artık gösterilmiyor. DNS sağlayıcınızdaki eski kayıtları ayrıca kontrol edin.');});};"""
p=p[:start]+replacement+p[end:]
p=p.replace('Globe2,RefreshCw,ShieldCheck,','RefreshCw,')
p=p.replace('<Globe2 className="size-4"/>Mağaza adresleri','Mağaza adresleri')
p=p.replace('<ShieldCheck className="size-4"/>Bağlantı durumu','Bağlantı durumu')
# prevent stale domain status showing after removal
p=p.replace('const hosting=data?.appHosting;','const hosting=data?.domain?data.appHosting:null;')
service.write_text(s);controller.write_text(c);ui.write_text(p)
print('v5 applied: dedicated DELETE API, verified persistence, header icons removed')
