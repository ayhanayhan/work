from pathlib import Path
root=Path(__file__).resolve().parent
service=root/'apps/api/src/merchant/merchant.service.ts'
controller=root/'apps/api/src/merchant/merchant.controller.ts'
s=service.read_text()
if 'async connectCloudflareDomain(' not in s:
 marker='  async syncCloudflareDomain(tenantId:string,storeId:string){'
 if marker not in s:raise SystemExit('Domain API marker missing. Apply v2 first.')
 methods="""  async connectCloudflareDomain(tenantId:string,storeId:string,body:any){
    await this.assertStore(tenantId,storeId);
    const token=String(body?.apiToken||'').trim();const zoneId=String(body?.zoneId||'').trim();
    if(!token||!zoneId||token.length>1024||!/^[a-f0-9]{32}$/i.test(zoneId))throw new BadRequestException('Geçerli API Token ve 32 karakterli Zone ID girin');
    const response=await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`,{headers:{Authorization:`Bearer ${token}`}});
    const payload:any=await response.json().catch(()=>({}));
    if(!response.ok||payload?.success!==true||String(payload?.result?.id||'')!==zoneId)throw new BadRequestException('Cloudflare Zone ID veya API Token doğrulanamadı. Zone:Read ve DNS:Edit yetkilerini kontrol edin.');
    const result=await this.integrations.upsertProviderConnection(tenantId,{type:'MARKETING',provider:'cloudflare-dns',name:'Cloudflare DNS',credentials:{apiToken:token},config:{zoneId},enabled:true});
    return {connected:true,verified:true,zoneId,connectionId:result.id};
  }

  async disconnectCloudflareDomain(tenantId:string,storeId:string){
    await this.assertStore(tenantId,storeId);
    await this.integrations.disableProviderConnection(tenantId,'cloudflare-dns');
    return {connected:false};
  }

"""
 s=s.replace(marker,methods+marker,1)
# guard against old v1 domain API: require v2 removal behavior
if 'if(body?.domain!==undefined)' not in s[s.find('  async updateDomainSettings('):s.find('  async syncCloudflareDomain(')]:raise SystemExit('v2 domain update required')
service.write_text(s)
c=controller.read_text()
if 'domain/cloudflare-connect' not in c:
 marker="  @Post('store-settings/:id/domain/cloudflare-sync')"
 if marker not in c:raise SystemExit('Cloudflare route marker missing')
 routes="""  @RequirePermission('settings.manage')
  @Post('store-settings/:id/domain/cloudflare-connect') domainCloudflareConnect(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.connectCloudflareDomain(t,id,b);}
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/domain/cloudflare-disconnect') domainCloudflareDisconnect(@CurrentTenant() t:string,@Param('id') id:string){return this.svc.disconnectCloudflareDomain(t,id);}
"""
 c=c.replace(marker,routes+marker,1)
controller.write_text(c)
print('Domains v3 API patch applied')
