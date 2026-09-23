class recordRecentlyViewedProducts extends HTMLElement {
  constructor() {
    super();
    this.name = "wokiee_recently_viewed";
    this.recordRecentlyViewed();
  }
  config(){
    return {
      howManyToStoreInMemory: Number(this.getAttribute('data-count'))+1,
      settings: this.getAttribute('data-settings')
    };
  }
  setCookie(name,value,days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }
  getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) {
        var arr = c.substring(nameEQ.length,c.length);
        return arr.split(' ');
      }
    }
    return [];
  }
  recordRecentlyViewed(){ 
    var config = this.config(),
        recentlyViewed = this.getCookie(this.name);
    if (window.location.pathname.indexOf('/products/') !== -1) {
      var productHandle = document.querySelector('[data-product-handle]').getAttribute('data-product-handle'),
          position = -1;
      if(recentlyViewed){
        position = recentlyViewed.indexOf(productHandle);
      }
      if (position === -1) {
        recentlyViewed.unshift(productHandle);
        recentlyViewed = recentlyViewed.splice(0, config.howManyToStoreInMemory);
      }
      else {
        recentlyViewed.splice(position, 1);
        recentlyViewed.unshift(productHandle);              
      }
      this.setCookie(this.name,recentlyViewed.join(' '),1);
    }
  }
}
class recentlyViewedProducts extends recordRecentlyViewedProducts {
  constructor() {
    super();
    
    var currentproducts = this.getCookie(this.name);
    if(currentproducts.length <= 0){
            console.log(currentproducts.length)
        if(Shopify.designMode){
            this.getProducts("");
        }
        return;
    }

    if (window.location.pathname.indexOf('/products/') !== -1) {
      var productHandle = document.querySelector('[data-product-handle]').getAttribute('data-product-handle'),
          index = currentproducts.indexOf(productHandle);
      if (index !== -1) currentproducts.splice(index, 1);
    }
    currentproducts = currentproducts.join('||');
    this.getProducts(currentproducts);
  }
  getProducts(currentproducts){
    var _this = this;
    fetch(`${window.routes.collections_url}/all?view=ajax_recently_viewed&sort_by=${currentproducts}|split|${this.config().settings}`)
      .then((response) => response.text())
      .then((responseText) => {
        console.log()
        responseText == "" ? _this.classList.add("hide"):_this.classList.remove("hide");
        _this.querySelector('.recently-viewed-products-content').innerHTML = responseText;
      });
  }
}

customElements.define('recently-viewed-products', recentlyViewedProducts);
!document.querySelector('recently-viewed-products') && customElements.define('recently-viewed-products-record', recordRecentlyViewedProducts);