import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, Res, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CustomerGuard } from '../common/customer.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../media/media.service';
import { StorefrontService } from './storefront.service';
import { ThemeLiquidRuntimeService } from './theme-liquid-runtime.service';
import { verifyThemePreviewToken } from '../common/theme-preview-token';
@Controller('storefront')
export class StorefrontController {
  constructor(private svc: StorefrontService, private liquidTheme: ThemeLiquidRuntimeService, private media: MediaService) {}
  private readCookie(req:any,name:string){const raw=String(req.headers?.cookie||'');for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===name)return decodeURIComponent(v.join('='));}return '';}
  private setCustomerRefresh(res:any,token:string){const secure=process.env.NODE_ENV==='production'?'; Secure':'';const sameSite=String(process.env.AUTH_COOKIE_SAMESITE||'Lax');const path=String(process.env.CUSTOMER_AUTH_COOKIE_PATH||'/v1/storefront/customer');res.setHeader('Set-Cookie',`commerce_customer_refresh=${encodeURIComponent(token)}; HttpOnly; Path=${path}; SameSite=${sameSite}; Max-Age=${30*86400}${secure}`);}
  private clearCustomerRefresh(res:any){const secure=process.env.NODE_ENV==='production'?'; Secure':'';const sameSite=String(process.env.AUTH_COOKIE_SAMESITE||'Lax');const path=String(process.env.CUSTOMER_AUTH_COOKIE_PATH||'/v1/storefront/customer');res.setHeader('Set-Cookie',`commerce_customer_refresh=; HttpOnly; Path=${path}; SameSite=${sameSite}; Max-Age=0${secure}`);}
  private browserCustomer(result:any,res:any){if(!result?.refreshToken)return result;const {refreshToken,...safe}=result;this.setCustomerRefresh(res,refreshToken);return safe;}
  @Get('reference-data') reference(@Query('country') c?:string){return this.svc.referenceData(c);}
  @Get(':storeSlug/locations') locations(@Param('storeSlug') s:string,@Query('parentId') p?:string,@Query('countryCode') c?:string,@Query('level') l?:any){return this.svc.publicGeoChildren(s,p,c,l);}
  @Get(':storeSlug/b2b/config') b2bConfig(@Param('storeSlug') s:string){return this.svc.publicB2BConfig(s);}
  @Post(':storeSlug/b2b/quote') guestB2BQuote(@Param('storeSlug') s:string,@Body() b:any){return this.svc.createB2BQuote(s,b);}
  @Post(':storeSlug/live/heartbeat') liveHeartbeat(@Param('storeSlug') s:string,@Body() b:any,@Req() req:any){return this.svc.liveHeartbeat(s,b,req);}
  @Get(':storeSlug/theme/asset') async themeAsset(@Param('storeSlug') s:string,@Query('name') name:string,@Query('themeId') themeId:string,@Query('v') assetVersion:string,@Res() res:any){const out=await this.liquidTheme.asset(s,name,themeId);res.setHeader('Content-Type',out.mime);/* ticarti:theme-asset-sha-v2 */const valid=/^[a-f0-9]{64}$/i.test(String(out.etag||''));const matched=valid&&assetVersion===out.etag;res.setHeader('Cache-Control',matched?'public, max-age=31536000, immutable':'private, no-store, max-age=0');if(out.etag)res.setHeader('ETag',out.etag);return res.send(out.data);}
  @Get(':storeSlug/theme/render') async themeRender(@Param('storeSlug') s:string,@Query('path') path:string,@Query('currency') c:string,@Query('locale') l:string,@Query('cartToken') cartToken:string,@Query('apiBase') apiBase:string,@Query('themeId') themeId:string,@Query('previewToken') previewToken:string,@Req() req:any){/* ticarti:v11-render-tracing */ const v11Started=Date.now();const boot:any=await this.svc.bootstrap(s,c,l);const v11BootMs=Date.now()-v11Started;if(themeId&&themeId!==String(boot?.theme?.id||'')&&themeId!==String(boot?.theme?.slug||'')){if(!verifyThemePreviewToken(previewToken,String(boot?.store?.id||''),String(themeId)))throw new ForbiddenException('Invalid or expired theme preview token');}const rawPath=String(path||'/');const p=(rawPath.split('?')[0]||'/').replace(/^\/(?:tr|en|pt|ru|es)(?=\/|$)/i,'')||'/';const pathQuery=new URLSearchParams(rawPath.includes('?')?rawPath.slice(rawPath.indexOf('?')+1):'');const facetQuery:any={};for(const [key,value] of pathQuery.entries()){if(key.startsWith('filter.')||['sort','page','minPrice','maxPrice','q'].includes(key))facetQuery[key]=value;}const apiOrigin=`${req.protocol||'https'}://${req.get?.('host')||req.headers?.host||''}`;const extra:any={origin:String(req.query?.origin||req.headers?.origin||apiOrigin),apiBase:String(apiBase||'/api/v1'),themeId:String(themeId||'')};try{if(p==='/products'){
          const category=String(pathQuery.get('category')||'');
          const q=String(pathQuery.get('q')||'');
          if(category)extra.collection=await this.svc.category(s,category,{currency:c,locale:l,...facetQuery,q});
          else{
            const all=await this.svc.products(s,{currency:c,locale:l,...facetQuery,q,limit:60});
            extra.collection={...all,collection:{title:q?`Arama: ${q}`:'Tüm Ürünler',name:q?`Arama: ${q}`:'Tüm Ürünler',slug:'all',handle:'all',url:'/products',description:'',products:all.items||[],products_count:Number(all?.pagination?.total||0)}};
          }
        }else if(p.startsWith('/products/')){const segments=p.split('/').filter(Boolean).slice(1);const categoryHandle=decodeURIComponent(segments[segments.length-1]||'');extra.collection=await this.svc.category(s,categoryHandle,{currency:c,locale:l,...facetQuery});}else if(p.startsWith('/product/')){const productHandle=decodeURIComponent(p.split('/').filter(Boolean)[1]||'');extra.product=await this.svc.product(s,productHandle,c,l);extra.recommendations=await this.svc.productRecommendations(s,productHandle,'related',12,c,l);}else if(p.startsWith('/collections/')&&p!='/collections/all')extra.collection=await this.svc.collection(s,decodeURIComponent(p.split('/').filter(Boolean)[1]||''),{currency:c,locale:l,...facetQuery});else if(p.startsWith('/pages/'))extra.page=await this.svc.page(s,decodeURIComponent(p.split('/').filter(Boolean)[1]||''),l);else if(p.startsWith('/blog/')&&p.split('/').filter(Boolean).length>1)extra.article=await this.svc.blogPost(s,decodeURIComponent(p.split('/').filter(Boolean)[1]||''),c,l);else if(p==='/cart'&&cartToken){ /* Cart is resolved consistently for all pages below. */ }
        if(cartToken){
          try{
            const activeCart=await this.svc.getCart(cartToken);
            if(String(activeCart.storeId)===String(boot?.store?.id))extra.cart=activeCart;
          }catch(_cartError){/* Invalid/expired visitor cart: render empty */}
        }}catch(error){if(p==='/products'||p.startsWith('/products/')||p.startsWith('/product/')||p.startsWith('/collections/'))throw error;}const v11DataMs=Date.now()-v11Started-v11BootMs;const rendered=await this.liquidTheme.render(s,boot,p,l,c,extra);console.log(JSON.stringify({component:'ticarti-liquid',event:'render_pipeline',stage:'controller',bootstrapMs:v11BootMs,pageDataMs:v11DataMs,renderMs:Date.now()-v11Started-v11BootMs-v11DataMs,totalMs:Date.now()-v11Started,kind:rendered?.engine||'native',preview:false}));return rendered||{engine:'native'};}
  @Post(':storeSlug/theme/render') async themeRenderPreview(@Param('storeSlug') s:string,@Body() b:any,@Req() req:any){const raw=JSON.stringify(b||{});if(Buffer.byteLength(raw,'utf8')>512*1024)throw new BadRequestException('Theme preview payload is too large');const c=String(b?.currency||'');const l=String(b?.locale||'');const boot:any=await this.svc.bootstrap(s,c,l);const themeId=String(b?.themeId||boot?.theme?.id||'');if(!themeId||!verifyThemePreviewToken(String(b?.previewToken||req.headers?.['x-theme-preview-token']||''),String(boot?.store?.id||''),themeId))throw new ForbiddenException('Invalid or expired theme preview token');const rawPath=String(b?.path||'/');const p=(rawPath.split('?')[0]||'/').replace(/^\/(?:tr|en|pt|ru|es)(?=\/|$)/i,'')||'/';const pathQuery=new URLSearchParams(rawPath.includes('?')?rawPath.slice(rawPath.indexOf('?')+1):'');const apiOrigin=`${req.protocol||'https'}://${req.get?.('host')||req.headers?.host||''}`;const extra:any={origin:String(b?.origin||req.headers?.origin||apiOrigin),apiBase:String(b?.apiBase||'/api/v1'),settingsCurrent:b?.settingsCurrent&&typeof b.settingsCurrent==='object'?b.settingsCurrent:{},templates:b?.templates&&typeof b.templates==='object'?b.templates:{},groups:b?.groups&&typeof b.groups==='object'?b.groups:{},designMode:true,themeId};try{if(p==='/products'){
          const category=String(pathQuery.get('category')||'');
          const q=String(pathQuery.get('q')||'');
          if(category)extra.collection=await this.svc.category(s,category,{currency:c,locale:l,q});
          else{
            const all=await this.svc.products(s,{currency:c,locale:l,q,limit:60});
            extra.collection={...all,collection:{title:q?`Arama: ${q}`:'Tüm Ürünler',name:q?`Arama: ${q}`:'Tüm Ürünler',slug:'all',handle:'all',url:'/products',description:'',products:all.items||[],products_count:Number(all?.pagination?.total||0)}};
          }
        }else if(p.startsWith('/products/')){const segments=p.split('/').filter(Boolean).slice(1);const categoryHandle=decodeURIComponent(segments[segments.length-1]||'');extra.collection=await this.svc.category(s,categoryHandle,{currency:c,locale:l});}else if(p.startsWith('/product/')){const productHandle=decodeURIComponent(p.split('/').filter(Boolean)[1]||'');extra.product=await this.svc.product(s,productHandle,c,l);extra.recommendations=await this.svc.productRecommendations(s,productHandle,'related',12,c,l);}else if(p.startsWith('/collections/')&&p!='/collections/all')extra.collection=await this.svc.collection(s,decodeURIComponent(p.split('/').filter(Boolean)[1]||''),{currency:c,locale:l});else if(p.startsWith('/pages/'))extra.page=await this.svc.page(s,decodeURIComponent(p.split('/').filter(Boolean)[1]||''),l);else if(p.startsWith('/blog/')&&p.split('/').filter(Boolean).length>1)extra.article=await this.svc.blogPost(s,decodeURIComponent(p.split('/').filter(Boolean)[1]||''),c,l);}catch(error){if(p==='/products'||p.startsWith('/products/')||p.startsWith('/product/')||p.startsWith('/collections/'))throw error;}const rendered=await this.liquidTheme.render(s,boot,p,l,c,extra);return rendered||{engine:'native'};}
  @Get(':storeSlug/localized-path') localizedPath(@Param('storeSlug') s:string,@Query('path') path:string,@Query('locale') locale:string){return this.svc.localizedPath(s,path,locale);}
  @Get(':storeSlug/seo/config') seoConfig(@Param('storeSlug') s:string){return this.svc.seoPublicConfig(s);}
  @Get(':storeSlug/seo/sitemap') seoSitemap(@Param('storeSlug') s:string,@Query('type') type?:string,@Query('page') page?:string,@Query('limit') limit?:string){return this.svc.seoSitemap(s,type||'all',Number(page||1),Number(limit||40000));}
  @Post(':storeSlug/seo/not-found') seoNotFound(@Param('storeSlug') s:string,@Body() b:any,@Req() req:any){return this.svc.seoRecordNotFound(s,b,req);}
  @Get(':storeSlug/shell') shell(@Param('storeSlug') s:string){return this.svc.bootstrapShell(s);}
  @Get(':storeSlug') bootstrap(@Param('storeSlug') s:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.bootstrap(s,c,l);}
  @Get(':storeSlug/products') products(@Param('storeSlug') s:string,@Query() q:any){return this.svc.products(s,q);}
  @Get(':storeSlug/categories/:categorySlug') category(@Param('storeSlug') s:string,@Param('categorySlug') c:string,@Query() q:any){return this.svc.category(s,c,q);}
  @Get(':storeSlug/products/:productSlug/recommendations') productRecommendations(@Param('storeSlug') s:string,@Param('productSlug') p:string,@Query('type') type?:string,@Query('limit') limit?:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.productRecommendations(s,p,type||'related',limit||'12',c,l);}
  @Get(':storeSlug/collections') collections(@Param('storeSlug') s:string){return this.svc.collections(s);}
  @Get(':storeSlug/collections/:collectionSlug') collection(@Param('storeSlug') s:string,@Param('collectionSlug') c:string,@Query() q:any){return this.svc.collection(s,c,q);}
  @Post(':storeSlug/theme/wishlist-cards') async themeWishlistCards(
    @Param('storeSlug') slug:string,@Body() body:any){
    const ids=Array.isArray(body?.ids)?body.ids:[];
    if(ids.length>80||ids.some((x:any)=>typeof x!=='string'||x.length>128))
      throw new BadRequestException('Invalid wishlist item selection');
    const selected=ids.filter((x:string)=>x.trim()).slice(0,80);
    const locale=String(body?.locale||'').slice(0,20);
    const currency=String(body?.currency||'').slice(0,3);
    const settings=String(body?.settings||'').slice(0,4096);
    const [boot,products]=await Promise.all([
      this.svc.bootstrap(slug,currency,locale),
      this.svc.productSelection(slug,selected.join(','),currency,locale)
    ]);
    return this.liquidTheme.renderWishlistCards(slug,boot,products?.items||[],settings,locale,currency);
  }
  @Get(':storeSlug/product-selection') productSelection(@Param('storeSlug') s:string,@Query('ids') ids:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.productSelection(s,ids,c,l);}
  @Get(':storeSlug/products/:productSlug') product(@Param('storeSlug') s:string,@Param('productSlug') p:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.product(s,p,c,l);}
  @Get(':storeSlug/blog/categories') blogCategories(@Param('storeSlug') s:string,@Query('locale') l?:string){return this.svc.blogCategories(s,l);}
  @Get(':storeSlug/blog/posts') blogPosts(@Param('storeSlug') s:string,@Query() q:any){return this.svc.blogPosts(s,q);}
  @Get(':storeSlug/blog/posts/:postSlug') blogPost(@Param('storeSlug') s:string,@Param('postSlug') p:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.blogPost(s,p,c,l);}
  @Post(':storeSlug/blog/posts/:postSlug/comments') guestBlogComment(@Param('storeSlug') s:string,@Param('postSlug') p:string,@Body() b:any,@Req() req:any){return this.svc.addGuestBlogComment(s,p,b,req);}
  @Get(':storeSlug/pages/:pageSlug') page(@Param('storeSlug') s:string,@Param('pageSlug') p:string,@Query('locale') l?:string){return this.svc.page(s,p,l);}
  @Get(':storeSlug/legal/:type') legal(@Param('storeSlug') s:string,@Param('type') t:string,@Query('locale') l?:string){return this.svc.legal(s,t,l);}
  @Post(':storeSlug/customers/register') async register(@Param('storeSlug') s:string,@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){return this.browserCustomer(await this.svc.customerRegister(s,b,req),res);}
  @Post(':storeSlug/customers/verify/request') requestVerification(@Param('storeSlug') s:string,@Body() b:any){return this.svc.requestCustomerEmailVerification(s,b?.email);}
  @Post(':storeSlug/customers/verify') async verifyEmail(@Param('storeSlug') s:string,@Body() b:any,@Res({passthrough:true}) res:any){return this.browserCustomer(await this.svc.verifyCustomerEmail(s,b?.token),res);}
  @Post(':storeSlug/customers/password/forgot') forgotPassword(@Param('storeSlug') s:string,@Body() b:any){return this.svc.requestCustomerPasswordReset(s,b?.email);}
  @Post(':storeSlug/customers/password/reset') resetPassword(@Param('storeSlug') s:string,@Body() b:any){return this.svc.resetCustomerPassword(s,b?.token,b?.password);}
  @Post(':storeSlug/customers/login') async login(@Param('storeSlug') s:string,@Body() b:any,@Res({passthrough:true}) res:any){return this.browserCustomer(await this.svc.customerLogin(s,b),res);}
  @Get('customer/session') async browserSession(@Req() req:any){const token=this.readCookie(req,'commerce_customer_refresh');if(!token)return{authenticated:false};try{return{authenticated:true,...await this.svc.customerSession(token)}}catch{return{authenticated:false}}}
  @Post('customer/refresh') async refresh(@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){const token=b?.refreshToken||this.readCookie(req,'commerce_customer_refresh');if(!token)throw new UnauthorizedException('Customer refresh session required');return this.browserCustomer(await this.svc.customerRefresh(token),res);}
  @Post('customer/logout') async logout(@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){const token=b?.refreshToken||this.readCookie(req,'commerce_customer_refresh');if(token)await this.svc.customerLogout(token);this.clearCustomerRefresh(res);return{loggedOut:true};}
  @UseGuards(CustomerGuard) @Get('customer/me') me(@Req() req:any){return this.svc.me(req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('customer/b2b/quote') customerB2BQuote(@Req() req:any,@Body() b:any){return this.svc.createB2BQuoteByCustomer(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Patch('customer/me') updateMe(@Req() req:any,@Body() b:any){return this.svc.updateMe(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Post('customer/addresses') address(@Req() req:any,@Body() b:any){return this.svc.addAddress(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Delete('customer/addresses/:addressId') deleteCustomerAddress(@Req() req:any,@Param('addressId') a:string){return this.svc.deleteAddress(req.customer.sub,a);}
  @UseGuards(CustomerGuard) @Patch('customer/addresses/:addressId') updateAddress(@Req() req:any,@Param('addressId') a:string,@Body() b:any){return this.svc.updateAddress(req.customer.sub,a,b);}
  @UseGuards(CustomerGuard) @Get('customer/orders') orders(@Req() req:any){return this.svc.myOrders(req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('customer/orders/:orderId/cancel') cancelOrder(@Req() req:any,@Param('orderId') o:string,@Body() b:any){return this.svc.cancelCustomerOrder(req.customer.sub,o,b);}
  @UseGuards(CustomerGuard) @Get('customer/returns') returns(@Req() req:any){return this.svc.myReturns(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/reviews') myReviews(@Req() req:any,@Headers('accept-language') l?:string){return this.svc.myReviews(req.customer.sub,l);}
  @UseGuards(CustomerGuard) @Post('customer/blog-comments') customerBlogComment(@Req() req:any,@Body() b:any){return this.svc.addCustomerBlogComment(req.customer.sub,b,req);}
  @UseGuards(CustomerGuard) @Post('customer/reviews') customerReview(@Req() req:any,@Body() b:any,@Headers('accept-language') l?:string){return this.svc.addCustomerReview(req.customer.sub,b,l);}
  @UseGuards(CustomerGuard) @Get('customer/questions') myQuestions(@Req() req:any){return this.svc.myQuestions(req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('customer/questions') ask(@Req() req:any,@Body() b:any){return this.svc.askCustomerQuestion(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Get('customer/privacy-requests') myPrivacy(@Req() req:any){return this.svc.myPrivacyRequests(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/consents') myConsents(@Req() req:any){return this.svc.myConsents(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/wishlist') wishlist(@Req() req:any,@Headers('accept-language') l?:string){return this.svc.wishlist(req.customer.sub,l);}
  @UseGuards(CustomerGuard) @Post('customer/wishlist/merge') mergeWishlist(@Req() req:any,@Body() b:any,@Headers('accept-language') l?:string){return this.svc.mergeWishlist(req.customer.sub,req.customer.storeId,b?.productIds,l);}
  @UseGuards(CustomerGuard) @Post('customer/wishlist/:productId') toggleWishlist(@Req() req:any,@Param('productId') p:string,@Headers('accept-language') l?:string){return this.svc.toggleWishlist(req.customer.sub,req.customer.storeId,p,l);}
  @UseGuards(CustomerGuard) @Post('customer/returns/upload') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:12*1024*1024,files:1,fields:24,parts:26,fieldNameSize:200,fieldSize:1048576}})) async returnUpload(@Req() req:any,@UploadedFile() file:any){const a:any=await this.media.upload(req.customer.storeId,req.customer.storeId,file,'İade görseli','returns');return{id:a.id,url:a.publicUrl};}
  @UseGuards(CustomerGuard) @Post('customer/orders/:orderId/returns') returnRequest(@Req() req:any,@Param('orderId') o:string,@Body() b:any){return this.svc.requestReturn(req.customer.sub,o,b);}
  @Post(':storeSlug/reviews') review(@Param('storeSlug') s:string,@Body() b:any,@Headers('accept-language') l?:string){return this.svc.addReview(s,b,undefined,l);}
  @Post(':storeSlug/cookie-preferences/:visitorId') cookies(@Param('storeSlug') s:string,@Param('visitorId') v:string,@Body() b:any){return this.svc.cookiePreference(s,v,b);}
  @Post(':storeSlug/privacy-requests') privacy(@Param('storeSlug') s:string,@Body() b:any){return this.svc.privacyRequest(s,b);}
  @Post(':storeSlug/carts') createCart(@Param('storeSlug') s:string,@Body() b:any){return this.svc.createCart(s,b?.currency,b?.affiliateCode);}
  @Get('carts/:token/checkout') checkoutData(@Param('token') t:string){return this.svc.checkoutData(t);}
  @Get('carts/:token') cart(@Param('token') t:string){return this.svc.getCart(t);}
  @Patch('carts/:token/currency') currency(@Param('token') t:string,@Body() b:any){return this.svc.setCartCurrency(t,b.currency);}
  @Patch('carts/:token/affiliate') affiliate(@Param('token') t:string,@Body() b:any){return this.svc.setCartAffiliate(t,b.code);}
  @Post('carts/:token/items') addItem(@Param('token') t:string,@Body() b:any){return this.svc.addCartItem(t,b);}
  @Patch('carts/:token/items/:itemId') updateItem(@Param('token') t:string,@Param('itemId') i:string,@Body() b:any){return this.svc.updateCartItem(t,i,Number(b.quantity));}
  @Delete('carts/:token/items/:itemId') removeItem(@Param('token') t:string,@Param('itemId') i:string){return this.svc.removeCartItem(t,i);}
  @Post('carts/:token/discount') discount(@Param('token') t:string,@Body() b:any){return this.svc.applyDiscount(t,b.code);}
  @Delete('carts/:token/discount/:code') removeDiscount(@Param('token') t:string,@Param('code') c:string){return this.svc.removeCoupon(t,c);}
  @Patch('carts/:token/shipping') shipping(@Param('token') t:string,@Body() b:any){return this.svc.selectShipping(t,b.shippingMethodId);}
  @Patch('carts/:token/payment') payment(@Param('token') t:string,@Body() b:any){return this.svc.selectPayment(t,b.paymentMethodId);}
  @Post('carts/:token/checkout-benefits') benefits(@Param('token') t:string,@Body() b:any){return this.svc.checkoutBenefits(t,b);}
  @UseGuards(CustomerGuard) @Post('carts/:token/checkout-benefits/customer') customerBenefitsPreview(@Param('token') t:string,@Body() b:any,@Req() req:any){return this.svc.checkoutBenefits(t,b,req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('carts/:token/checkout/customer') customerCheckout(@Param('token') t:string,@Body() b:any,@Req() req:any){return this.svc.checkout(t,b,req.customer.sub,req);}
  @Post('carts/:token/checkout') checkout(@Param('token') t:string,@Body() b:any,@Req() req:any){return this.svc.checkout(t,b,undefined,req);}
}
