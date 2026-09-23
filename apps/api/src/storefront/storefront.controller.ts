import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CustomerGuard } from '../common/customer.guard';
import { StorefrontService } from './storefront.service';
@Controller('storefront')
export class StorefrontController {
  constructor(private svc: StorefrontService) {}
  private readCookie(req:any,name:string){const raw=String(req.headers?.cookie||'');for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===name)return decodeURIComponent(v.join('='));}return '';}
  private setCustomerRefresh(res:any,token:string){const secure=process.env.NODE_ENV==='production'?'; Secure':'';const sameSite=String(process.env.AUTH_COOKIE_SAMESITE||'Lax');const path=String(process.env.CUSTOMER_AUTH_COOKIE_PATH||'/v1/storefront/customer');res.setHeader('Set-Cookie',`commerce_customer_refresh=${encodeURIComponent(token)}; HttpOnly; Path=${path}; SameSite=${sameSite}; Max-Age=${30*86400}${secure}`);}
  private clearCustomerRefresh(res:any){const secure=process.env.NODE_ENV==='production'?'; Secure':'';const sameSite=String(process.env.AUTH_COOKIE_SAMESITE||'Lax');const path=String(process.env.CUSTOMER_AUTH_COOKIE_PATH||'/v1/storefront/customer');res.setHeader('Set-Cookie',`commerce_customer_refresh=; HttpOnly; Path=${path}; SameSite=${sameSite}; Max-Age=0${secure}`);}
  private browserCustomer(result:any,res:any){const {refreshToken,...safe}=result;this.setCustomerRefresh(res,refreshToken);return safe;}
  @Get('reference-data') reference(@Query('country') c?:string){return this.svc.referenceData(c);}
  @Get(':storeSlug/locations') locations(@Param('storeSlug') s:string,@Query('parentId') p?:string,@Query('countryCode') c?:string,@Query('level') l?:any){return this.svc.publicGeoChildren(s,p,c,l);}
  @Post(':storeSlug/live/heartbeat') liveHeartbeat(@Param('storeSlug') s:string,@Body() b:any,@Req() req:any){return this.svc.liveHeartbeat(s,b,req);}
  @Get(':storeSlug') bootstrap(@Param('storeSlug') s:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.bootstrap(s,c,l);}
  @Get(':storeSlug/products') products(@Param('storeSlug') s:string,@Query() q:any){return this.svc.products(s,q);}
  @Get(':storeSlug/products/:productSlug') product(@Param('storeSlug') s:string,@Param('productSlug') p:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.product(s,p,c,l);}
  @Get(':storeSlug/blog/categories') blogCategories(@Param('storeSlug') s:string){return this.svc.blogCategories(s);}
  @Get(':storeSlug/blog/posts') blogPosts(@Param('storeSlug') s:string,@Query() q:any){return this.svc.blogPosts(s,q);}
  @Get(':storeSlug/blog/posts/:postSlug') blogPost(@Param('storeSlug') s:string,@Param('postSlug') p:string,@Query('currency') c?:string,@Query('locale') l?:string){return this.svc.blogPost(s,p,c,l);}
  @Post(':storeSlug/blog/posts/:postSlug/comments') guestBlogComment(@Param('storeSlug') s:string,@Param('postSlug') p:string,@Body() b:any,@Req() req:any){return this.svc.addGuestBlogComment(s,p,b,req);}
  @Get(':storeSlug/pages/:pageSlug') page(@Param('storeSlug') s:string,@Param('pageSlug') p:string,@Query('locale') l?:string){return this.svc.page(s,p,l);}
  @Get(':storeSlug/legal/:type') legal(@Param('storeSlug') s:string,@Param('type') t:string,@Query('locale') l?:string){return this.svc.legal(s,t,l);}
  @Post(':storeSlug/customers/register') async register(@Param('storeSlug') s:string,@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){return this.browserCustomer(await this.svc.customerRegister(s,b,req),res);}
  @Post(':storeSlug/customers/login') async login(@Param('storeSlug') s:string,@Body() b:any,@Res({passthrough:true}) res:any){return this.browserCustomer(await this.svc.customerLogin(s,b),res);}
  @Post('customer/refresh') async refresh(@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){const token=b?.refreshToken||this.readCookie(req,'commerce_customer_refresh');if(!token)throw new UnauthorizedException('Customer refresh session required');return this.browserCustomer(await this.svc.customerRefresh(token),res);}
  @Post('customer/logout') async logout(@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){const token=b?.refreshToken||this.readCookie(req,'commerce_customer_refresh');if(token)await this.svc.customerLogout(token);this.clearCustomerRefresh(res);return{loggedOut:true};}
  @UseGuards(CustomerGuard) @Get('customer/me') me(@Req() req:any){return this.svc.me(req.customer.sub);}
  @UseGuards(CustomerGuard) @Patch('customer/me') updateMe(@Req() req:any,@Body() b:any){return this.svc.updateMe(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Post('customer/addresses') address(@Req() req:any,@Body() b:any){return this.svc.addAddress(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Patch('customer/addresses/:addressId') updateAddress(@Req() req:any,@Param('addressId') a:string,@Body() b:any){return this.svc.updateAddress(req.customer.sub,a,b);}
  @UseGuards(CustomerGuard) @Get('customer/orders') orders(@Req() req:any){return this.svc.myOrders(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/returns') returns(@Req() req:any){return this.svc.myReturns(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/reviews') myReviews(@Req() req:any){return this.svc.myReviews(req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('customer/blog-comments') customerBlogComment(@Req() req:any,@Body() b:any){return this.svc.addCustomerBlogComment(req.customer.sub,b,req);}
  @UseGuards(CustomerGuard) @Post('customer/reviews') customerReview(@Req() req:any,@Body() b:any){return this.svc.addCustomerReview(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Get('customer/questions') myQuestions(@Req() req:any){return this.svc.myQuestions(req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('customer/questions') ask(@Req() req:any,@Body() b:any){return this.svc.askCustomerQuestion(req.customer.sub,b);}
  @UseGuards(CustomerGuard) @Get('customer/privacy-requests') myPrivacy(@Req() req:any){return this.svc.myPrivacyRequests(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/consents') myConsents(@Req() req:any){return this.svc.myConsents(req.customer.sub);}
  @UseGuards(CustomerGuard) @Get('customer/wishlist') wishlist(@Req() req:any){return this.svc.wishlist(req.customer.sub);}
  @UseGuards(CustomerGuard) @Post('customer/wishlist/:productId') toggleWishlist(@Req() req:any,@Param('productId') p:string){return this.svc.toggleWishlist(req.customer.sub,req.customer.storeId,p);}
  @UseGuards(CustomerGuard) @Post('customer/orders/:orderId/returns') returnRequest(@Req() req:any,@Param('orderId') o:string,@Body() b:any){return this.svc.requestReturn(req.customer.sub,o,b);}
  @Post(':storeSlug/reviews') review(@Param('storeSlug') s:string,@Body() b:any){return this.svc.addReview(s,b);}
  @Post(':storeSlug/cookie-preferences/:visitorId') cookies(@Param('storeSlug') s:string,@Param('visitorId') v:string,@Body() b:any){return this.svc.cookiePreference(s,v,b);}
  @Post(':storeSlug/privacy-requests') privacy(@Param('storeSlug') s:string,@Body() b:any){return this.svc.privacyRequest(s,b);}
  @Post(':storeSlug/carts') createCart(@Param('storeSlug') s:string,@Body() b:any){return this.svc.createCart(s,b?.currency);}
  @Get('carts/:token/checkout') checkoutData(@Param('token') t:string){return this.svc.checkoutData(t);}
  @Get('carts/:token') cart(@Param('token') t:string){return this.svc.getCart(t);}
  @Patch('carts/:token/currency') currency(@Param('token') t:string,@Body() b:any){return this.svc.setCartCurrency(t,b.currency);}
  @Post('carts/:token/items') addItem(@Param('token') t:string,@Body() b:any){return this.svc.addCartItem(t,b);}
  @Patch('carts/:token/items/:itemId') updateItem(@Param('token') t:string,@Param('itemId') i:string,@Body() b:any){return this.svc.updateCartItem(t,i,Number(b.quantity));}
  @Delete('carts/:token/items/:itemId') removeItem(@Param('token') t:string,@Param('itemId') i:string){return this.svc.removeCartItem(t,i);}
  @Post('carts/:token/discount') discount(@Param('token') t:string,@Body() b:any){return this.svc.applyDiscount(t,b.code);}
  @Delete('carts/:token/discount/:code') removeDiscount(@Param('token') t:string,@Param('code') c:string){return this.svc.removeCoupon(t,c);}
  @Patch('carts/:token/shipping') shipping(@Param('token') t:string,@Body() b:any){return this.svc.selectShipping(t,b.shippingMethodId);}
  @Patch('carts/:token/payment') payment(@Param('token') t:string,@Body() b:any){return this.svc.selectPayment(t,b.paymentMethodId);}
  @UseGuards(CustomerGuard) @Post('carts/:token/checkout/customer') customerCheckout(@Param('token') t:string,@Body() b:any,@Req() req:any){return this.svc.checkout(t,b,req.customer.sub,req);}
  @Post('carts/:token/checkout') checkout(@Param('token') t:string,@Body() b:any,@Req() req:any){return this.svc.checkout(t,b,undefined,req);}
}
