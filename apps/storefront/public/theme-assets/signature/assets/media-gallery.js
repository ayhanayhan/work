var elementName = 'swiper-slider-container';
if (!customElements.get(elementName)) {
  class swiperSliderContainer extends HTMLElement {
    constructor() {
      super();
      this.querySelectorAll('.swiper-thumb').forEach((item) => {
        item.addEventListener("click", this.clickHandler.bind(this));
      });
      if(this.isTouchDevice()===false) {
        this.querySelectorAll('.swiper-thumb__container--horizontal').forEach((item) => {
          var _this = this;
          item.addEventListener("mouseenter", function(){
            if(window.innerWidth <= 1024) return false;
            if(item.scrollWidth <= _this.offsetWidth) return false;
            document.body.style.paddingRight = window.innerWidth > 1024 ? _this.getScrollbarWidth() + 'px' : '';
            document.body.classList.add('overflow-hidden');
          });
          item.addEventListener("mouseleave", function(){
            if(window.innerWidth <= 1024) return false;
            if(item.scrollWidth <= _this.offsetWidth) return false;
            document.body.classList.remove('overflow-hidden');
            document.body.style.paddingRight = '';
          });
        });
      }
      
      this.swiperthumbcontainer = this.querySelector('.swiper-thumb__container');
      this.swiper = this.querySelector('.swiper');
      this.duration = 100;
      this.swiper.addEventListener('slide_inited', this.slideInitedCustom.bind(this), false);
      this.swiper.addEventListener('slide_changed_custom', this.slideChangedCustom.bind(this), false);

      this.closest('.product--thumbnail_slider__mobile') && this.mobileThumbSize();
    }
    isTouchDevice(){
      return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
    }
    mobileThumbSize(){
      var swiper__thumb__container = this.querySelector('.swiper-thumb__container');
      if(window.innerWidth > 576 || !swiper__thumb__container) return false;
      window.addEventListener("resize", this.resizeHandler.bind(this), false);
      this.resizeHandler();
    }
    resizeHandler(){
      var swiper__thumb__container = this.querySelector('.swiper-thumb__container'),
          w = swiper__thumb__container.offsetWidth,
          item_w = (swiper__thumb__container.offsetWidth - 10 * 4)/5;
      swiper__thumb__container.style.setProperty('--thumb-width', `${item_w}px`);
    }
    slideInitedCustom(){
      var sect = this.closest('.shopify-section')||this.closest('.popup-modal__content__data');
      if(sect.querySelector('select-option-js.active')){
        return false;
      }
      var default_media_id = this.getAttribute('data-current-media-id');
      this.changeSlideSwiper(default_media_id, 0);
    }
    slideChangedCustom(){
      if(!this.querySelector('.swiper-slide-active [data-media-id]')) return false;
      var _this = this;
      if(this.querySelector('.swiper-thumb__container--horizontal') || window.innerWidth <= 1024){
        setTimeout(function(){
          var _id = _this.querySelector('.swiper-slide-active [data-media-id]').getAttribute('data-media-id');
          _this.horizontaldesign(_id);
        },0);
      }
      else{
        setTimeout(function(){
          var _id = _this.querySelector('.swiper-slide-active [data-media-id]').getAttribute('data-media-id');
          _this.verticaldesign(_id);
        },0);
      }
      setTimeout(function(){
        _this.playActiveMedia(_this.querySelector('.swiper-slide-active [data-media-id]'));
      },100);
    }
    clickHandler(e){
      this.querySelector('.active').classList.remove('active');
      e.currentTarget.classList.add('active');

      var _id = e.currentTarget.getAttribute('data-media-id');
      this.changeSlideSwiper(_id);
    }
    changeSlideSwiper(_id, delay){
      delay = delay === undefined || delay === null ? 300 : delay;
      var swiperslider = this.querySelector('swiper-slider');

      if(!swiperslider.querySelector(`[data-media-id="${_id}"]`)) return;
      var item_img = swiperslider.querySelector(`[data-media-id="${_id}"]`).closest('.swiper-slide');
      if(!item_img) return;
      const nodes = Array.prototype.slice.call( item_img.parentNode.childNodes );
      var index = nodes.indexOf(item_img);

      var sw = swiperslider.querySelectorAll(`.swiper-slide`)[0];
      const sw_nodes = Array.prototype.slice.call( sw.parentNode.childNodes );
      const sw_index = nodes.indexOf(sw);
      index = index - sw_index;

      this.querySelector('.swiper').selectSlide(index, delay);
      //this.playActiveMedia(item_img);
    }
    changeSlide(_id){
      if(this.querySelector('.swiper-thumb__container--horizontal') || window.innerWidth <= 1024){
        this.horizontaldesign(_id);
      }
      else{
        this.verticaldesign(_id);
      }
      this.changeSlideSwiper(_id);
    }
    verticaldesign(...args){
      if(!this.swiperthumbcontainer) return false;
      var _id = args[0],
          item = this.swiperthumbcontainer.querySelector(`[data-media-id="${_id}"]`),
          temp = 0;
      this.swiperthumbcontainer.querySelector('.active').classList.remove('active');
      item.classList.add('active');

      var _y = item.offsetTop-this.swiperthumbcontainer.offsetTop,
          _h = this.swiperthumbcontainer.offsetHeight,
          main_scrolltop = this.swiperthumbcontainer.scrollTop,
          item_y = _y-main_scrolltop+item.offsetHeight;

      if(item_y > _h){
        temp = main_scrolltop + (item_y-_h);
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollTop');
      }
      else if(_y < main_scrolltop){
        temp = this.swiperthumbcontainer.scrollTop - (main_scrolltop - _y);
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollTop');
      }
    }
    horizontaldesign(...args){
      if(!this.swiperthumbcontainer) return false;
      var _id = args[0],
          item = this.swiperthumbcontainer.querySelector(`[data-media-id="${_id}"]`),
          temp = 0;
      this.swiperthumbcontainer.querySelector('.active').classList.remove('active');
      item.classList.add('active');
    
      var _x = item.offsetLeft-this.swiperthumbcontainer.offsetLeft,
          _w = this.swiperthumbcontainer.offsetWidth,
          main_scrollleft = this.swiperthumbcontainer.scrollLeft,
          item_x = _x-main_scrollleft+item.offsetWidth;

      var delta = window.innerWidth <= 576 ? 15 : 0;
      if(item_x > _w){
        temp = main_scrollleft + (item_x-_w) + delta;
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollLeft');
      }
      else if(_x < main_scrollleft){
        temp = this.swiperthumbcontainer.scrollLeft - (main_scrollleft - _x) + delta;
        this.scrollTo(this.swiperthumbcontainer, temp, this.duration, 'scrollLeft');
      }
    }
    playActiveMedia(activeItem) {
      const deferredMedia = activeItem.parentNode.querySelector('.deferred-media');
      if (deferredMedia) deferredMedia.loadContent(false);
    }
    scrollTo(el, to, duration, option) {
      Math.easeInOutQuad = function (t, b, c, d) {
        t /= d/2;
        if (t < 1) return c/2*t*t + b;
        t--;
        return -c/2 * (t*(t-2) - 1) + b;
      };

      const element = el;
      const start = element[option],
            change = to - start,
            increment = 20;
      var currentTime = 0;
      
      const animateScroll = function(){
        currentTime += increment;
        const val = Math.easeInOutQuad(currentTime, start, change, duration);
        element[option] = val;
        if(currentTime < duration) {
          window.setTimeout(animateScroll, increment);
        }
      };
      animateScroll();
    }
    getScrollbarWidth() {
      return window.innerWidth - document.documentElement.clientWidth;
    }
  }
  customElements.define('swiper-slider-container', swiperSliderContainer);
}

elementName = 'theme-lightbox';
if (!customElements.get(elementName)) {
  class themeLightbox extends HTMLElement {
    constructor() {
      super();
      var slides = this.querySelectorAll('.swiper-slide'),
          bullets = this.querySelector('.swiper-pagination');
      window.addEventListener("resize", this.resizeHandler.bind(this), false);
      this.resizeHandler();
      this.querySelector('.theme-lightbox__toggle').addEventListener("click", this.close.bind(this), false);
    }
    resizeHandler(){
      this.querySelectorAll('.theme-lightbox__image').forEach((item) => {
        var ww = window.innerWidth - 218,
            wh = window.innerHeight - 136,
            iw = item.naturalWidth,
            ih = item.naturalHeight,
            wr = ww/iw;
        if(iw > ih ){
          if(ih*wr >= wh){
            item.classList.remove('theme-lightbox__image--wide');
          }
          else{
            item.classList.add('theme-lightbox__image--wide');
          }
        }
      });
    }
    open(data_media_id){
      this.classList.add('active');
      setTimeout(() => {
        this.classList.add('animate');
      });
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
      document.body.classList.add('overflow-hidden');

      
      var item_img = this.querySelector(`[data-media-id="${data_media_id}"]`).closest('.swiper-slide');
      const nodes = Array.prototype.slice.call( item_img.parentNode.childNodes );
      const index = nodes.indexOf(item_img);
      this.querySelector('.swiper').selectSlide(index);
    }
    close() {
      this.classList.remove('animate');
      setTimeout(() => {
        this.classList.remove('active');
      }, 500);
      document.body.classList.remove('overflow-hidden');
      document.body.style.paddingRight = '';
      window.pauseAllMedia();
    }
    getScrollbarWidth() {
      return window.innerWidth - document.documentElement.clientWidth;
    }
  }
  customElements.define('theme-lightbox', themeLightbox);
}

elementName = 'lightbox-opener';
if (!customElements.get(elementName)) {
  class lightboxOpener extends HTMLElement {
    constructor() {
      super();
      this.addEventListener("click", this.clickHandler.bind(this));
    }
    clickHandler(e){
      var id = this.getAttribute('data-id'),
          item = document.getElementById(id),
          data_media_id = this.getAttribute('data-media-id');
      item.open(data_media_id);
    }
  }
  customElements.define('lightbox-opener', lightboxOpener);
}