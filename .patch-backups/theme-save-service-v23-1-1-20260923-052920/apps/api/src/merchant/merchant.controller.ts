import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { MerchantService } from './merchant.service';

@Controller('admin')
@UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
export class MerchantController {
  constructor(private svc: MerchantService) {}

  @Get('reference-data') reference(@Query('country') c?: string) { return this.svc.referenceData(c); }

  @RequirePermission('analytics.read')
  @Get('dashboard') dashboard(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.dashboard(t, s); }

  @RequirePermission('settings.manage')
  @Post('stores') createStore(@CurrentTenant() t:string,@Req() req:any,@Body() b:any){ return this.svc.createStoreForUser(t,req.user.sub,b); }

  @RequirePermission('analytics.read')
  @Get('live') live(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.liveTracking(t,s); }

  @RequirePermission('orders.manage')
  @Post('pos/quote') posQuote(@CurrentTenant() t:string,@Body() b:any){ return this.svc.posQuote(t,b); }
  @RequirePermission('orders.manage')
  @Post('pos/orders') posOrder(@CurrentTenant() t:string,@Req() req:any,@Body() b:any){ return this.svc.createPosOrder(t,req.user.sub,b); }

  @RequirePermission('settings.manage')
  @Patch('site/:id') updateStore(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateStore(t, id, b); }
  @RequirePermission('settings.read')
  @Get('store-settings/:id') storeSettings(@CurrentTenant() t: string, @Param('id') id: string) { return this.svc.storeSettings(t, id); }
  @RequirePermission('settings.read')
  @Get('store-settings/:id/domain') domainSettings(@CurrentTenant() t:string,@Param('id') id:string){ return this.svc.domainSettings(t,id); }
  @RequirePermission('settings.read')
  @Get('store-settings/:id/domain-availability') domainAvailability(@CurrentTenant() t:string,@Param('id') id:string,@Query('subdomain') subdomain:string){ return this.svc.subdomainAvailability(t,id,subdomain); }
  @RequirePermission('settings.manage')
  @Patch('store-settings/:id/domain') domainUpdate(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateDomainSettings(t,id,b); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/domain/cloudflare-sync') domainCloudflareSync(@CurrentTenant() t:string,@Param('id') id:string){ return this.svc.syncCloudflareDomain(t,id); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/addresses') address(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.upsertStoreAddress(t, id, b); }
  @RequirePermission('settings.read')
  @Get('store-settings/:id/currencies') currencies(@CurrentTenant() t: string, @Param('id') id: string) { return this.svc.currencies(t, id); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/currencies') currency(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.upsertCurrency(t, id, b); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/locales') locale(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.upsertLocale(t, id, b); }
  @RequirePermission('settings.manage')
  @Patch('store-settings/:id/checkout') checkoutConfig(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateCheckoutConfig(t, id, b); }
  @RequirePermission('settings.manage')
  @Patch('store-settings/:id/comment-settings') commentSettings(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateCommentSettings(t, id, b); }
  @RequirePermission('settings.read')
  @Get('store-settings/:id/contracts') contractSettings(@CurrentTenant() t:string,@Param('id') id:string){ return this.svc.contractSettings(t,id); }
  @RequirePermission('settings.manage')
  @Patch('store-settings/:id/contracts') contractSettingsUpdate(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateContractSettings(t,id,b); }

  @RequirePermission('settings.manage')
  @Post('store-settings/:id/delete-request') storeDeleteRequest(@CurrentTenant() t:string,@Req() req:any,@Param('id') id:string){ return this.svc.requestStoreDeletion(t,req.user.sub,id); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/delete-confirm') storeDeleteConfirm(@CurrentTenant() t:string,@Req() req:any,@Param('id') id:string,@Body() b:any){ return this.svc.confirmStoreDeletion(t,req.user.sub,id,b.token); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/delete-cancel') storeDeleteCancel(@CurrentTenant() t:string,@Req() req:any,@Param('id') id:string){ return this.svc.cancelStoreDeletion(t,req.user.sub,id); }

  @RequirePermission('team.read')
  @Get('team') team(@CurrentTenant() t: string) { return this.svc.team(t); }
  @RequirePermission('team.manage')
  @Post('team') addTeam(@CurrentTenant() t: string, @Body() b: any) { return this.svc.addTeamMember(t, b); }
  @RequirePermission('team.manage')
  @Patch('team/:id') updateTeam(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateTeamMember(t, id, b); }
  @RequirePermission('team.manage')
  @Delete('team/:id') removeTeam(@CurrentTenant() t: string, @Param('id') id: string) { return this.svc.removeTeamMember(t, id); }
  @RequirePermission('team.read')
  @Get('roles') roles(@CurrentTenant() t: string) { return this.svc.roles(t); }
  @RequirePermission('team.read')
  @Get('permissions') permissions() { return this.svc.permissionCatalog(); }
  @RequirePermission('team.manage')
  @Post('roles') createRole(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createRole(t, b); }
  @RequirePermission('team.manage')
  @Patch('roles/:id') updateRole(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateRole(t, id, b); }
  @RequirePermission('team.read')
  @Get('subscription') subscription(@CurrentTenant() t: string) { return this.svc.subscription(t); }
  @RequirePermission('settings.read')
  @Get('plans') plans(@CurrentTenant() t: string) { return this.svc.planCatalog(t); }
  @RequirePermission('settings.manage')
  @Post('plans/:id/upgrade-request') planUpgrade(@CurrentTenant() t: string, @Req() req: any, @Param('id') id: string, @Body() b: any) { return this.svc.requestPlanUpgrade(t, req.user.sub, id, b); }

  @RequirePermission('settings.read')
  @Get('security/sessions') securitySessions(@Req() req:any){ return this.svc.merchantSessions(req.user.sub); }
  @RequirePermission('settings.manage')
  @Delete('security/sessions/:id') revokeSecuritySession(@Req() req:any,@Param('id') id:string){ return this.svc.revokeMerchantSession(req.user.sub,id,req.user.sid); }
  @RequirePermission('settings.read')
  @Get('api-keys') apiKeys(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.apiKeys(t,s); }
  @RequirePermission('settings.manage')
  @Post('api-keys') createApiKey(@CurrentTenant() t:string,@Body() b:any){ return this.svc.createApiKey(t,b.storeId,b); }
  @RequirePermission('settings.manage')
  @Delete('api-keys/:id') revokeApiKey(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){ return this.svc.revokeApiKey(t,s,id); }

  @RequirePermission('products.read')
  @Get('products') products(@CurrentTenant() t: string, @Query('storeId') s: string, @Query('q') q?: string) { return this.svc.products(t, s, q); }
  @RequirePermission('products.read')
  @Get('products/:id') product(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.product(t, s, id); }
  @RequirePermission('products.manage')
  @Post('products') createProduct(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createProduct(t, b.storeId, b); }
  @RequirePermission('products.manage')
  @Patch('products/:id') updateProduct(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateProduct(t, b.storeId, id, b); }
  @RequirePermission('products.manage')
  @Delete('products/:id') archiveProduct(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.archiveProduct(t, s, id); }
  @RequirePermission('products.manage')
  @Post('products/:id/variants') addVariant(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.addVariant(t, b.storeId, id, b); }
  @RequirePermission('products.manage')
  @Patch('variants/:id') updateVariant(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateVariant(t, b.storeId, id, b); }

  @RequirePermission('products.read')
  @Get('catalog/definitions') catalogDefinitions(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.catalogDefinitions(t,s); }
  @RequirePermission('products.manage')
  @Patch('catalog/definitions') catalogDefinitionsUpdate(@CurrentTenant() t:string,@Body() b:any){ return this.svc.updateCatalogDefinitions(t,b.storeId,b.definitions); }

  @RequirePermission('products.read')
  @Get('categories') categories(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.categories(t, s); }
  @RequirePermission('products.manage')
  @Post('categories') createCategory(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createCategory(t, b.storeId, b); }
  @RequirePermission('products.manage')
  @Patch('categories/:id') updateCategory(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateCategory(t, b.storeId, id, b); }
  @RequirePermission('products.read')
  @Get('brands') brands(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.brands(t, s); }
  @RequirePermission('products.manage')
  @Post('brands') createBrand(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createBrand(t, b.storeId, b); }

  @RequirePermission('customers.read')
  @Get('customers') customers(@CurrentTenant() t: string, @Query('storeId') s: string, @Query('q') q?: string) { return this.svc.customers(t, s, q); }
  @RequirePermission('customers.read')
  @Get('customers/:id') customer(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.customer(t, s, id); }

  @RequirePermission('customers.read')
  @Get('customer-groups') customerGroups(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.customerGroups(t,s); }
  @RequirePermission('customers.manage')
  @Post('customer-groups') createCustomerGroup(@CurrentTenant() t:string,@Body() b:any){ return this.svc.createCustomerGroup(t,b.storeId,b); }
  @RequirePermission('customers.manage')
  @Patch('customer-groups/:id') updateCustomerGroup(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateCustomerGroup(t,b.storeId,id,b); }
  @RequirePermission('customers.manage')
  @Delete('customer-groups/:id') deleteCustomerGroup(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){ return this.svc.deleteCustomerGroup(t,s,id); }
  @RequirePermission('customers.manage')
  @Patch('customers/:id/group') assignCustomerGroup(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.assignCustomerGroup(t,b.storeId,id,b.groupId); }

  @RequirePermission('orders.read')
  @Get('orders') orders(@CurrentTenant() t: string, @Query('storeId') s: string, @Query('status') st?: any) { return this.svc.orders(t, s, st); }
  @RequirePermission('orders.read')
  @Get('orders/:id') order(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.order(t, s, id); }
  @RequirePermission('orders.manage')
  @Patch('orders/:id/status') orderStatus(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateOrderStatus(t, b.storeId, id, b); }

  // Legacy discounts stay for backward compatibility; new work should use Promotions.
  @RequirePermission('promotions.read')
  @Get('discounts') discounts(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.discounts(t, s); }
  @RequirePermission('promotions.manage')
  @Post('discounts') createDiscount(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createDiscount(t, b.storeId, b); }
  @RequirePermission('promotions.manage')
  @Patch('discounts/:id') updateDiscount(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateDiscount(t, b.storeId, id, b); }
  @RequirePermission('promotions.read')
  @Get('promotions') promotions(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.promotions(t, s); }
  @RequirePermission('promotions.manage')
  @Post('promotions') promotion(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createPromotion(t, b.storeId, b); }
  @RequirePermission('promotions.manage')
  @Patch('promotions/:id') updatePromotion(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updatePromotion(t, b.storeId, id, b); }

  @RequirePermission('settings.read')
  @Get('shipping-methods') shipping(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.shippingMethods(t, s); }
  @RequirePermission('settings.manage')
  @Post('shipping-methods') createShipping(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createShippingMethod(t, b.storeId, b); }
  @RequirePermission('settings.manage')
  @Patch('shipping-methods/:id') updateShipping(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateShippingMethod(t, b.storeId, id, b); }
  @RequirePermission('settings.manage')
  @Delete('shipping-methods/:id') deleteShipping(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){ return this.svc.deleteShippingMethod(t,s,id); }
  @RequirePermission('settings.read')
  @Get('payment-methods') payment(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.paymentMethods(t, s); }
  @RequirePermission('settings.manage')
  @Post('payment-methods') createPayment(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createPaymentMethod(t, b.storeId, b); }
  @RequirePermission('settings.manage')
  @Patch('payment-methods/:id') updatePayment(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updatePaymentMethod(t, b.storeId, id, b); }

  @RequirePermission('content.read')
  @Get('pages') pages(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.pages(t, s); }
  @RequirePermission('content.manage')
  @Post('pages') createPage(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createPage(t, b.storeId, b); }
  @RequirePermission('content.manage')
  @Patch('pages/:id') updatePage(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updatePage(t, b.storeId, id, b); }
  @RequirePermission('content.manage')
  @Delete('pages/:id') deletePage(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){ return this.svc.deletePage(t,s,id); }
  @RequirePermission('content.read')
  @Get('menus') menus(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.menus(t, s); }
  @RequirePermission('content.manage')
  @Post('menus') menu(@CurrentTenant() t: string, @Body() b: any) { return this.svc.upsertMenu(t, b.storeId, b); }
  @RequirePermission('content.read')
  @Get('banners') banners(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.banners(t, s); }
  @RequirePermission('content.manage')
  @Post('banners') banner(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createBanner(t, b.storeId, b); }

  @RequirePermission('content.read')
  @Get('blog/categories') blogCategories(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.blogCategories(t, s); }
  @RequirePermission('content.manage')
  @Post('blog/categories') createBlogCategory(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createBlogCategory(t, b.storeId, b); }
  @RequirePermission('content.manage')
  @Patch('blog/categories/:id') updateBlogCategory(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateBlogCategory(t, b.storeId, id, b); }
  @RequirePermission('content.manage')
  @Delete('blog/categories/:id') deleteBlogCategory(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.deleteBlogCategory(t, s, id); }

  @RequirePermission('content.read')
  @Get('blog/posts') blogPosts(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.blogPosts(t, s); }
  @RequirePermission('content.manage')
  @Post('blog/posts') createBlogPost(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createBlogPost(t, b.storeId, b); }
  @RequirePermission('content.manage')
  @Patch('blog/posts/:id') updateBlogPost(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateBlogPost(t, b.storeId, id, b); }
  @RequirePermission('content.manage')
  @Delete('blog/posts/:id') deleteBlogPost(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.deleteBlogPost(t, s, id); }

  @RequirePermission('reviews.read')
  @Get('blog/comments') blogComments(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.blogComments(t, s); }
  @RequirePermission('reviews.manage')
  @Patch('blog/comments/:id') updateBlogComment(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateBlogComment(t, b.storeId, id, b); }
  @RequirePermission('reviews.manage')
  @Delete('blog/comments/:id') deleteBlogComment(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.deleteBlogComment(t, s, id); }

  @RequirePermission('reviews.read')
  @Get('reviews') reviews(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.reviews(t, s); }
  @RequirePermission('reviews.manage')
  @Patch('reviews/:id') review(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.moderateReview(t, b.storeId, id, b.status); }
  @RequirePermission('returns.read')
  @Get('returns') returns(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.returns(t, s); }
  @RequirePermission('returns.manage')
  @Patch('returns/:id') updateReturn(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateReturn(t, b.storeId, id, b); }

  @RequirePermission('marketing.read')
  @Get('loyalty') loyalty(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.loyalty(t, s); }
  @RequirePermission('marketing.manage')
  @Patch('loyalty') updateLoyalty(@CurrentTenant() t: string, @Body() b: any) { return this.svc.updateLoyalty(t, b.storeId, b); }
  @RequirePermission('marketing.read')
  @Get('marketing/campaigns') campaigns(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.marketingCampaigns(t, s); }
  @RequirePermission('marketing.manage')
  @Post('marketing/campaigns') campaign(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createMarketingCampaign(t, b.storeId, b); }
  @RequirePermission('marketing.read')
  @Get('marketing/automations') automations(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.marketingAutomations(t, s); }
  @RequirePermission('marketing.manage')
  @Post('marketing/automations') automation(@CurrentTenant() t: string, @Body() b: any) { return this.svc.createMarketingAutomation(t, b.storeId, b); }

  @RequirePermission('privacy.read')
  @Get('legal-documents') legal(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.legalDocuments(t, s); }
  @RequirePermission('privacy.manage')
  @Post('legal-documents') legalSave(@CurrentTenant() t: string, @Body() b: any) { return this.svc.upsertLegalDocument(t, b.storeId, b); }
  @RequirePermission('privacy.read')
  @Get('privacy/requests') privacy(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.privacyRequests(t, s); }
  @RequirePermission('privacy.manage')
  @Patch('privacy/requests/:id') privacyUpdate(@CurrentTenant() t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updatePrivacyRequest(t, b.storeId, id, b); }
  @RequirePermission('privacy.read')
  @Get('privacy/consents') consents(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.consentRecords(t, s); }
  @RequirePermission('settings.read')
  @Get('audit-logs') audit(@CurrentTenant() t: string, @Query('storeId') s?: string) { return this.svc.auditLogs(t, s); }

  @RequirePermission('reviews.read')
  @Get('questions') questions(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){ return this.svc.questions(t,s,q); }
  @RequirePermission('reviews.manage')
  @Patch('questions/:id') updateQuestion(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateQuestion(t,b.storeId,id,b); }

  @RequirePermission('settings.read')
  @Get('locations') locations(@CurrentTenant() t:string,@Query('parentId') parentId?:string,@Query('countryCode') countryCode?:string,@Query('level') level?:any){ return this.svc.geoChildren(t,parentId,countryCode,level); }
  @RequirePermission('settings.manage')
  @Patch('locations/system/:id') locationOverride(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.geoOverrideSave(t,id,b); }
  @RequirePermission('settings.manage')
  @Post('locations/custom') locationCustom(@CurrentTenant() t:string,@Body() b:any){ return this.svc.geoCustomCreate(t,b); }
  @RequirePermission('settings.manage')
  @Patch('locations/custom/:id') locationCustomUpdate(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.geoCustomUpdate(t,id,b); }

  @RequirePermission('content.read')
  @Get('seo') seo(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.seoOverview(t,s); }
  @RequirePermission('settings.manage')
  @Patch('seo/settings') seoSettings(@CurrentTenant() t:string,@Body() b:any){ return this.svc.updateSeoSettings(t,b.storeId,b); }
  @RequirePermission('content.manage')
  @Post('seo/rules') seoRule(@CurrentTenant() t:string,@Body() b:any){ return this.svc.saveSeoRule(t,b.storeId,b); }
  @RequirePermission('content.manage')
  @Post('seo/redirects') seoRedirect(@CurrentTenant() t:string,@Body() b:any){ return this.svc.saveRedirect(t,b.storeId,b); }


  @RequirePermission('content.read')
  @Get('themes') themes(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.themeCatalog(t,s); }
  @RequirePermission('content.manage')
  @Post('themes/:id/activate') activateTheme(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.activateTheme(t,b.storeId,id,b); }

  @RequirePermission('content.read')
  @Get('design/history') designHistory(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.designHistory(t,s); }
  @RequirePermission('content.manage')
  @Post('design/history') designHistoryCreate(@CurrentTenant() t:string,@Body() b:any){ return this.svc.createDesignHistory(t,b.storeId,b); }
  @RequirePermission('content.manage')
  @Post('design/history/:id/restore') designHistoryRestore(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.restoreDesignHistory(t,b.storeId,id); }

  @RequirePermission('content.manage')
  @Post('design/publish') designPublish(@CurrentTenant() t:string,@Body() b:any){ return this.svc.publishThemeDesign(t,b.storeId,b); }

  @RequirePermission('content.read')
  @Get('design/settings') designSettings(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.designSettings(t,s); }
  @RequirePermission('content.manage')
  @Patch('design/settings') designSettingsSave(@CurrentTenant() t:string,@Body() b:any){ return this.svc.updateDesignSettings(t,b.storeId,b); }
  @RequirePermission('content.read')
  @Get('design/sections') design(@CurrentTenant() t:string,@Query('storeId') s:string,@Query('pageKey') p?:string){ return this.svc.designSections(t,s,p||'home'); }
  @RequirePermission('content.manage')
  @Post('design/sections') designSave(@CurrentTenant() t:string,@Body() b:any){ return this.svc.saveDesignSection(t,b.storeId,b); }
  @RequirePermission('content.manage')
  @Patch('design/sections/snapshot') designSnapshot(@CurrentTenant() t:string,@Body() b:any){ return this.svc.replaceDesignSections(t,b.storeId,b); }
  @RequirePermission('content.manage')
  @Patch('design/sections/order') designOrder(@CurrentTenant() t:string,@Body() b:any){ return this.svc.reorderDesignSections(t,b.storeId,b); }
  @RequirePermission('content.manage')
  @Patch('design/sections/:id') designUpdate(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateDesignSection(t,b.storeId,id,b); }
  @RequirePermission('content.manage')
  @Delete('design/sections/:id') designDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){ return this.svc.deleteDesignSection(t,s,id); }

  @RequirePermission('settings.read')
  @Get('warehouses') warehouses(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.warehouses(t,s); }
  @RequirePermission('settings.manage')
  @Post('warehouses') warehouseCreate(@CurrentTenant() t:string,@Body() b:any){ return this.svc.createWarehouse(t,b.storeId,b); }
  @RequirePermission('settings.manage')
  @Patch('warehouses/:id') warehouseUpdate(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateWarehouse(t,b.storeId,id,b); }
  @RequirePermission('settings.manage')
  @Delete('warehouses/:id') warehouseDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){ return this.svc.deleteWarehouse(t,s,id); }

  @RequirePermission('settings.read')
  @Get('store-settings/:id/regional') regional(@CurrentTenant() t:string,@Param('id') id:string){ return this.svc.regionalSettings(t,id); }
  @RequirePermission('settings.manage')
  @Patch('store-settings/:id/regional') regionalUpdate(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.updateRegionalSettings(t,id,b); }
  @RequirePermission('settings.manage')
  @Post('store-settings/:id/regional/refresh-rates') regionalRefreshRates(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){ return this.svc.refreshCurrencyRates(t,id,b); }

  @RequirePermission('settings.read')
  @Get('cache') cache(@CurrentTenant() t:string,@Query('storeId') s:string){ return this.svc.cacheSettings(t,s); }
  @RequirePermission('settings.manage')
  @Patch('cache') cacheUpdate(@CurrentTenant() t:string,@Body() b:any){ return this.svc.updateCacheSettings(t,b.storeId,b); }

  @RequirePermission('settings.manage')
  @Post('cache/purge') purgeCache(@CurrentTenant() t:string){ return this.svc.purgeCache(t); }
  @RequirePermission('settings.read')
  @Get('cache/stats') cacheStats(@CurrentTenant() t:string){ return this.svc.cacheStats(t); }

}
