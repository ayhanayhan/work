console.log('Wokiee Shopify Theme. Version 3.4.0 shopify 2.0. https://themeforest.net/item/wokiee-multipurpose-shopify-theme/22559417')

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    var _max = event.target.max;
    this.validateQtyRules();
    this.input.value = Math.max(Math.min(event.target.value, _max), 1);
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}
customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll('.popup-modal__toggle').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll('.popup-modal__toggle__close').forEach((summary) =>
      summary.addEventListener('click', this.closeMenuDrawer.bind(this))
    );
    this.querySelectorAll('button:not(.localization-selector):not(.disclosure-selector):not(.popup-modal__toggle):not(.popup-modal__toggle__close)').forEach((button) =>
      button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {   
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.closest('details');
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    if (detailsElement === this.mainDetailsToggle) {
      setTimeout(() => {
        if (isOpen) event.preventDefault();
        isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);
  
        if (window.matchMedia('(max-width: 1024px)')) {
          document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
        }
      }, 100);
    } else {
      setTimeout(() => {
        detailsElement.classList.add('details-opened');
        setTimeout(() => {
          detailsElement.classList.add('menu-opening');
          summaryElement.setAttribute('aria-expanded', true);
          parentMenuElement && parentMenuElement.classList.add('submenu-open');
        }, 100);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
	document.body.setAttribute('data-top', window.pageYOffset);
	document.body.style.top = `-${window.pageYOffset}px`;
    document.body.style.paddingRight = window.innerWidth > 1024 ? this.getScrollbarWidth() + 'px' : '';
	document.body.classList.add('overflow-hidden');
  }

  closeMenuDrawer(event, elementToFocus = false) {    
    if (event === undefined) return;
    var scrollPosition = document.body.getAttribute('data-top');
    document.body.style.removeProperty('top');
    document.body.classList.remove('overflow-hidden');
    document.body.removeAttribute('data-top');
    document.body.style.paddingRight = '';
    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      setTimeout(() => {
        details.removeAttribute('open');
        details.classList.remove('details-opened');
        details.classList.remove('menu-opening');
      }, 200);
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    window.scrollTo({
      top: scrollPosition,
      behavior: "instant"
    });

    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.classList.remove('details-opened');
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}
customElements.define('menu-drawer', MenuDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.close();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.close();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.close();
      });
    }
  }
  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }
  show(opener) {
    setTimeout(() => {
      this.classList.add('active');
      this.classList.add('animate');
    });

    if(!this.hasAttribute('data-webscroll')){
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
      document.body.classList.add('overflow-hidden');
    }

    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  close() {
    this.classList.remove('animate');
    setTimeout(() => {
      this.classList.remove('active');
      document.body.classList.remove('overflow-hidden');
      document.body.style.paddingRight = '';
    }, 500);
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
  getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }
}
customElements.define('modal-dialog', ModalDialog);
class MenumodalDialog extends ModalDialog {
  constructor() {
    super();
  }
  connectedCallback() {
  }
}
customElements.define('menumodal-dialog', MenumodalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button') || this.querySelector('a');

    if (!button) return;
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const attr = this.getAttribute('data-modal');
      const modal = document.querySelector(attr);
      if (attr == "#PopupModal-quickview"){
        var href = this.getAttribute('data-handle');
        window.dispatchEvent(new CustomEvent('openQuickView', {detail: {href:href}}));
      }
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
    this.addEventListener('stopVideo', this.stop.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        deferredElement.play();
      }
    }
    else if(this.querySelector('video')){
      var defElement = this.querySelector('video');
      if (defElement.getAttribute('autoplay')) {
        defElement.play();
      }
    }
  }
  stop(){
    window.pauseAllMedia();
  }
}
customElements.define('deferred-media', DeferredMedia);

class selectOptionJs extends HTMLElement {
  constructor() {
    super();
    var search = document.location.search;
    if(search.indexOf('variant=') == -1){
      this.classList.add('active');
      var _p = this.parentNode;
      _p.querySelectorAll('.product-form__item [checked]').forEach((item) => {
        item.removeAttribute('checked');
      });
    }
    else{
      var _p = this.parentNode;
      _p.querySelectorAll('.option-empty').forEach((item) => {
        item.remove();
      });
      _p.querySelectorAll('[selected-default]').forEach((item) => {
        item.setAttribute('selected', true);
      });
      var sect = this.closest('.shopify-section')||this.closest('.popup-modal__content__data');
      sect.querySelector('select-option-js').remove();
      document.querySelector('.sticky-cart__select_options__text')&&document.querySelector('.sticky-cart__select_options__text').classList.remove('sticky-cart__select_options__text');
    }
  }
}
customElements.define('select-option-js', selectOptionJs);

class ComplementaryProducts extends HTMLElement {
  observer = undefined;
  constructor() {
    super();
  }
  connectedCallback() {
    if(this.classList.contains('ignore-js')) return;
    this.initializeRecommendations(this.dataset.productId);
  }
  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }
  initializeRecommendations(productId) {
    this.observer?.unobserve(this);
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        observer.unobserve(this);
        this.loadRecommendations(productId);
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    this.observer.observe(this);
  }
  loadRecommendations(productId) {
    if (!this.isConnected) return;
    fetch(`${this.dataset.url}&product_id=${productId}&section_id=${this.dataset.sectionId}`)
      .then((response) => response.text())
      .then((text) => {
        if (!this.isConnected) return;
        var parser = new DOMParser();
        var doc = parser.parseFromString(text, "text/html");
        var recommendations = doc.querySelector('complementary-products');
        if (recommendations?.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
          this.closest('cart-drawer')&&this.closest('cart-drawer').updateRecommendations(this);
        }
        this.closest('cart-notification')&&this.closest('cart-notification').updateRecommendations(this);
      })
      .catch((e) => {
        console.error(e);
      });
  }

}
customElements.define('complementary-products', ComplementaryProducts);

class wokieeMasonry extends HTMLElement {
  constructor() {
    super();
    this.gutter = Number(this.getAttribute('data-gutter'));
    this.mobile = this.hasAttribute('data-mobile');
    this.resizeThrottle = null;
    this.lastWidth = 0;
    this.resizeHandler = this.resizeHandler.bind(this);
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeThrottle);
      this.resizeThrottle = setTimeout(this.resizeHandler, 100);
    });
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(this.resizeHandler, 100);
    });
    Shopify.designMode && setTimeout(this.resizeHandler, 100);
  }
  init() {
    this.classList.add('initialized');
    this.msnry = new Masonry(this, {
      itemSelector: '.wokiee-masonry__item',
      columnWidth: '.wokiee-masonry-grid-sizer',
      percentPosition: true,
      gutter: this.gutter
    });
  }
  destroy() {
    this.classList.remove('initialized');
    if (this.msnry) {
      this.msnry.destroy();
    }
    this.style.removeProperty("left");
  }
  resizeHandler() {
    const currentWidth = window.innerWidth;
    if (Math.abs(currentWidth - this.lastWidth) < 30) return;
    this.lastWidth = currentWidth;

    if (currentWidth > 576 || this.mobile) {
      if (!this.classList.contains('initialized')) {
        this.init();
      }
      requestAnimationFrame(() => {
        let totalWidth = 0;
        Array.from(this.children).forEach((item) => {
          totalWidth += item.offsetWidth + 10;
        });
        if (totalWidth > 0) {
          totalWidth -= 10;
          if (totalWidth < this.offsetWidth) {
            const margin = Math.round((this.offsetWidth - totalWidth) / 2);
            this.style.setProperty("left", margin + 'px');
          } else {
            this.style.removeProperty("left");
          }
          if (this.msnry) {
            this.msnry.layout();
          }
        }
      });
    } else {
      if (this.classList.contains('initialized')) {
        this.destroy();
      }
      this.style.removeProperty("left");
    }
  }
  disconnectedCallback() {
    clearTimeout(this.resizeThrottle);
    if (this.msnry) {
      this.msnry.destroy();
    }
  }
}
customElements.define('masonry-items', wokieeMasonry);

class wokieeSwiper extends HTMLElement {
  constructor() {
    super();
    this.swiper = false;
    this.classList.add('swiper-buttons-initialized');
    this.mouseEnterHandler = this.mouseEnterHandler.bind(this);
    this.setProductImages = this.setProductImages.bind(this);
    this.startHandler = this.start.bind(this);
    this.productCard = this.closest('.product-card');
    if(typeof Swiper === "function"){
      this.start();
    }
    else{
      this.isTouchDevice()||this.productCard === null?window.addEventListener('swiperLoaded', this.startHandler):window.addEventListener('swiperLoaded', this.mouseEnterHandler);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.loadSwiper.bind(this));
    } else {
      this.loadSwiper();
    }
  }
  loadSwiper(){
    if(!document.querySelector('.swiperjs')){
      let script = document.createElement('script');
      script.classList.add('swiperjs')
      script.src = this.getAttribute('data-script');
      script.onload = () => {
        window.dispatchEvent(new CustomEvent('swiperLoaded'))
      };
      document.head.append(script);
    }
    else{
      Shopify.designMode&&setTimeout(this.start.bind(this), 100);
    }
  }
  isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }
  mouseEnterHandler(){
    window.removeEventListener('swiperLoaded', this.mouseEnterHandler);
    this.productCard.addEventListener("mouseover", this.setProductImages);
  }
  setProductImages(){
    var _this = this;
    window.removeEventListener('swiperLoaded', this.startHandler)
    this.productCard&&this.productCard.removeEventListener("mouseover", this.setProductImages);
    this.querySelectorAll(`.swiper-slide:not(:first-child) tag-image`).forEach((item) => {
      const img = item.querySelector('img');
      if(img.hasAttribute('data-main')){
        const size = item.getSize(_this.offsetWidth);
        if(!size) return;
        img.src = size;
        img.removeAttribute('loading');
      }
    });
    this.startHandler();
  }
  start(){
    this.gutter = this.getAttribute('data-gutter');
    this.gutter_mobile = this.getAttribute('data-gutter-mobile');
    this.video_autoplay = this.getAttribute('data-autoplay') == "true" ? true : false;
    this.xl = Number(this.getAttribute('data-grid').split(',')[0]);
    this.sm = Number(this.getAttribute('data-grid').split(',')[1]);
    this.md = Number(this.getAttribute('data-grid').split(',')[2]);
    this.lg = Number(this.getAttribute('data-grid').split(',')[3]);
    this.xxl = Number(this.getAttribute('data-grid').split(',')[4]);

    if(this.classList.contains('swiper-nested')){
      setTimeout(this.init.bind(this), 300)
    }
    else{
      this.init();
    }

    if(!this.video_autoplay || Shopify.designMode) return;

    this.stopslider = false;
    var _this = this;
    this.addEventListener('mouseleave',this.mouseleave.bind(this));
	  this.querySelectorAll("video").forEach((item) => {
      var timeUpdateHandler = (event) => {
        if (event.target.currentTime >= event.target.duration - 0.3 || _this.stopslider && event.target.currentTime <= 0.02) {
          event.target.removeEventListener('timeupdate', timeUpdateHandler);
          _this.goToNextSlide();
        }
        _this.stopslider = true;
      }
      item.addEventListener('play', (event) => {
        _this.swiper.autoplay.stop();
        event.target.addEventListener('timeupdate', timeUpdateHandler);
        _this.stopslider = false;
      });
      
    })
    this.querySelectorAll(".banner__block-media").forEach((item) => {
      item.addEventListener('youtubeOnPlayerStateChange', (event) => {
        if(event.detail.state == 0){
          this.goToNextSlide();
        }
        if(event.detail.state != 1){
          return;
        }
        _this.swiper.autoplay.stop();
        var duration = Math.round((event.detail.getDuration-event.detail.getCurrentTime)*1000);
        clearTimeout(_this.slider);
        _this.slider = setTimeout(_this.goToNextSlide.bind(_this),duration);
        this.stopslider = true;
      });
	  })
  }
  mouseleave(){
    if(this.stopslider){
      this.stopslider = false;
      this.swiper.autoplay.stop();
      this.swiper.autoplay.start();
    }
  }
  goToNextSlide(){
    this.stopslider = false;
    this.swiper.autoplay.start();
    this.swiper.slideNext();
  }
  selectSlide(index, delay){
    delay = delay || 0;
    this.swiper.slideTo(index, delay);
  }
  resizeHandler(){
    setTimeout(this.initPaginationCss.bind(this), 100)
  }
  initPaginationCss(){
    if(!this.querySelector('.swiper-pagination')) return;
    var length = this.querySelector('.swiper-pagination').children.length;
    this.style.setProperty('--pagination-count', length);
    var bullets = this.querySelectorAll('.swiper-pagination-bullet');
    const isMobile = window.innerWidth <= 576;
    if(bullets.length > 28 && isMobile){
      this.style.cssText = `
        --swiper-pagination-bullet-size: 4px;
        --swiper-pagination-bullet-width: 4px;
        --swiper-pagination-bullet-height: 4px;
        --swiper-pagination-bullet-horizontal-gap: 2px;
        --pagination-item-width: 8px;
      `;
    }
    else if(!isMobile){
      this.style.cssText = `
        --swiper-pagination-bullet-size: 8px;
        --swiper-pagination-bullet-width: 8px;
        --swiper-pagination-bullet-height: 8px;
        --swiper-pagination-bullet-horizontal-gap: 4px;
        --pagination-item-width: 16px;
      `;
    }
  }
  init(){
    var autoplay = this.video_autoplay;
    if(autoplay){
      autoplay= {
        delay:Number(this.getAttribute('data-autoplay-delay')),
        pauseOnMouseEnter:true,
        disableOnInteraction:false
      }
    }
    else{
      autoplay = false;
    }

    this.configureSwiper();
    this.swiper.on('afterInit', this.afterInit.bind(this));
    this.swiper.on('slidesLengthChange', this.slideUpdate.bind(this));
    this.swiper.init();
    this.initSwiper();

    this.scroll_down = true;
    autoplay && document.addEventListener('scroll', this.documentScrollHandler.bind(this));
  }
  initSwiper(){
    typeof Swiper === "function"&&this.swiper.init();
  }
  configureSwiper(){
    try {
      var autoplay = this.video_autoplay;
      if(autoplay){
        autoplay= {
          delay:Number(this.getAttribute('data-autoplay-delay')),
          pauseOnMouseEnter:true,
          disableOnInteraction:false
        }
      }
      else{
        autoplay = false;
      }
      var effect = this.hasAttribute('data-effect') ? this.getAttribute('data-effect') : 'slide',
          autoheight = this.hasAttribute('data-autoheight') ? true : false,
          allowtouchmove = this.hasAttribute('data-allowtouchmove') ? false : true,
          nested = this.classList.contains('swiper-nested'),
          loop = this.classList.contains('swiper-loop')?true:nested,
          speed = this.hasAttribute('data-speed') ? this.getAttribute('data-speed') : 300;
      this.swiper = new Swiper(this, {
        init: false,
        slidesPerView: this.xl,
        autoplay: autoplay,
        rewind: true,
        effect: effect,
        autoHeight: autoheight,
        allowTouchMove: allowtouchmove,
        simulateTouch:true,
        slidesPerGroupAuto:this.xl,
        slidesPerGroup:this.xl,
        spaceBetween: this.gutter_mobile,
        nested:nested,
        loop:loop,
        speed:speed,
        breakpoints: {
          577: {
            slidesPerView: this.sm,
            slidesPerGroupAuto:this.sm,
            slidesPerGroup:this.sm,
            spaceBetween: this.gutter
          },
          1025: {
            slidesPerView: this.md,
            slidesPerGroupAuto:this.md,
            slidesPerGroup:this.md,
            spaceBetween: this.gutter
          },
          1361: {
            slidesPerView: this.lg,
            slidesPerGroupAuto:this.lg,
            slidesPerGroup:this.lg,
            spaceBetween: this.gutter
          },
          1441: {
            slidesPerView: this.xxl,
            slidesPerGroupAuto:this.xxl,
            slidesPerGroup:this.xxl,
            spaceBetween: this.gutter
          }
        },
        pagination: {
          el: this.nextElementSibling&&this.nextElementSibling.querySelector('.swiper-pagination')||this.querySelector('.swiper-pagination'),
          clickable: true
        },
        navigation: {
          nextEl: this.nextElementSibling&&this.nextElementSibling.querySelector('[class*="-swiper-button-next"')||this.querySelector('.internal-swiper-button-next')||this.querySelector('.internal-swiper-custom-button-next'),
          prevEl: this.nextElementSibling&&this.nextElementSibling.querySelector('[class*="-swiper-button-prev"')||this.querySelector('.internal-swiper-button-prev')||this.querySelector('.internal-swiper-custom-button-prev')
        }
      });
      this.swiper.on('slideChange', this.slideChange.bind(this));
      this.swiper.on('slideChangeTransitionStart', this.slideChangeTransitionStart.bind(this));
      this.swiper.on('slideChangeTransitionEnd', this.slideChangeTransitionEnd.bind(this));
    } 
    catch(err) {

    }
  }
  documentScrollHandler(e){
    var window_y = window.scrollY,
        offset_top = this.parentNode.offsetTop,
        object_bottom_position = this.offsetHeight + offset_top;

    if(window_y > object_bottom_position - 100){
      this.swiper.autoplay.stop(); 
      this.scroll_down = false;
    }
    else{
      !this.scroll_down && this.swiper.autoplay.start();
      this.scroll_down = true;
    }
  }
  afterInit(){
    var _this = this;
    setTimeout(function(){
      _this.classList.add('swiper-initialized-custom');
    }, 100)
    
    this.dispatchEvent(new CustomEvent('slide_inited'));
    if(this.querySelector('.swiper-pagination')){
      window.addEventListener('resize', this.resizeHandler.bind(this));
      this.initPaginationCss();
    }
  }
  destroy(){
    this.swiper&&this.swiper.destroy();
  }
  slideChange(e){
    clearTimeout(this.slider);
    this.querySelectorAll('video-js').forEach(item => {
      var index = Number(Array.prototype.indexOf.call(item.closest('.swiper-wrapper').children, item.closest('.swiper-slide')));
      e.activeIndex == index?item.dispatchEvent(new CustomEvent('playVideo')):item.dispatchEvent(new CustomEvent('stopVideo'));
    });
    this.querySelectorAll('video-youtube-js').forEach(item => {
      var index = Number(Array.prototype.indexOf.call(item.closest('.swiper-wrapper').children, item.closest('.swiper-slide')));
      e.activeIndex == index?item.dispatchEvent(new CustomEvent('playVideo')):item.dispatchEvent(new CustomEvent('stopVideo'));
      e.activeIndex == index?item.dispatchEvent(new CustomEvent('playVideo')):false;
    });
    this.querySelectorAll('deferred-media').forEach(item => {
      item.dispatchEvent(new CustomEvent('stopVideo'));
    });
    this.dispatchEvent(new CustomEvent('slide_changed_custom'));
  }
  slideChangeTransitionStart(){
  }
  slideChangeTransitionEnd(){
  } 
  slideUpdate(){
    setTimeout(this.initPaginationCss.bind(this), 100)
  }
  getActiveSlide(){
    return this.swiper.activeIndex;
  }
}
if (document.readyState === 'complete') {
  customElements.define('swiper-slider', wokieeSwiper);
}
else{
  window.addEventListener('load', () => {
    customElements.define('swiper-slider', wokieeSwiper);
  });
}


class mainSlider extends wokieeSwiper {
  constructor() {
    super();
    this.childs_string = '.banner__block-item__content__items>*';
    this.animationDelay = 100;
  }

  connectedCallback() {
    this.hideAllTexts();
  }

  hideAllTexts() {
    const texts = this.querySelectorAll(this.childs_string);
    texts.forEach(text => {
      text.style.opacity = '0';
      text.style.transform = 'translateX(80px)';
      text.style.transition = 'none';
    });
  }

  afterInit() {
    super.afterInit();
    setTimeout(() => {
      this.initTextAnimations();
    }, this.animationDelay);
  }

  initTextAnimations() {
    if (!this.swiper || !this.swiper.slides) return;
    const activeSlide = this.swiper.slides[this.swiper.activeIndex];
    if (activeSlide) {
      const activeTexts = activeSlide.querySelectorAll(this.childs_string);
      activeTexts.forEach((text, i) => {
        text.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
        text.style.opacity = '1';
        text.style.transform = 'translateX(0)';
      });
    }
  }

  slideChangeTransitionStart(e) {
    if (!this.swiper || !this.swiper.slides) return;
    var previousIndex = e.previousIndex;
    this.swiper.slides.forEach((slide, i) => {
      if(previousIndex != i){
        const texts = slide.querySelectorAll(this.childs_string);
        texts.forEach(text => {
          text.style.transition = 'none';
          text.style.opacity = '0';
          text.style.transform = 'translateX(140px)';
          void text.offsetWidth;
        });
      }
    });
  }

  slideChangeTransitionEnd() {
    if (!this.swiper || !this.swiper.slides) return;
    
    const activeSlide = this.swiper.slides[this.swiper.activeIndex];
    if (!activeSlide) return;
    
    const activeTexts = activeSlide.querySelectorAll(this.childs_string);
    activeTexts.forEach((text, i) => {
      text.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
      text.style.opacity = '1';
      text.style.transform = 'translateX(0)';
    });
  }
}
customElements.define('main-slider', mainSlider);

class ListSpotlight extends wokieeSwiper {
  constructor() {
    super();
  }
  connectedCallback() {
    this.closest('[data-section-name="collection-list-spotlight"]').querySelectorAll(".collection-list-spotlight").forEach((item) => {
      item.addEventListener("mouseover", this.mouseOverhandler.bind(this));
    });
  }
  mouseOverhandler(e){
    const target = e.currentTarget;
    this.activeIndex(target)
    const index = parseInt(target.getAttribute('data-index'));
    this.swiper.slideTo(index, 200);
  }
  slideChangeTransitionStart(e){
    var index = e.realIndex;
    var target = this.closest('[data-section-name="collection-list-spotlight"]').querySelector(`.collection-list-spotlight[data-index="${ index }"]`);
    this.activeIndex(target)
  }
  activeIndex(target){
    var _parent = target.closest(".collection-list-spotlight__names")
    _parent.querySelectorAll(".collection-list-spotlight").forEach(item => {
      item.classList.remove("active");
    });
    target.classList.add("active");
  }
}
customElements.define('list-spotlight', ListSpotlight);

class cardVariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }
  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.updateVariantStatuses();
    this.removeErrorMessage();
    
    if (!this.currentVariant) {
      this.setUnavailable();
    } else {
      this.renderProductInfo();
    }
  }
  removeErrorMessage() {
    var _product = this.closest('.product-card, .product-card-small'),
        productForm = _product.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }
  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&view=card-ajax`
    )
    .then((response) => response.text())
    .then((responseText) => {
      const html = new DOMParser().parseFromString(responseText, 'text/html');
      this.setHtmlInfo('price', html);

      var main_product = this.closest('.product-card, .product-card-small'),
          qtv = main_product.querySelector(`#Quantity-${this.getAttribute('data-product')}`);
      if(qtv){
        qtv.value = 1;
        qtv.setAttribute('max', html.getElementById(`max`).getAttribute('max'));
      }

      var card_form = main_product.querySelector(`#form-${this.getAttribute('data-product')}`);
      if(card_form){
        var button = card_form.querySelector('.quick-add__submit');
        var content = html.querySelector(`.${button.getAttribute('data-type')}`).innerHTML;
        button.querySelector('.btn__top-text').innerHTML = content;
        button.querySelector('.btn__bottom-text').innerHTML = content;
        if(html.getElementById(`button`).hasAttribute('disabled')){
          button.setAttribute('disabled', 'disabled');
          button.setAttribute('aria-disabled', true);
        }
        else{
          button.removeAttribute('disabled');
          button.removeAttribute('aria-disabled');
        }
      }

      var bd_co = main_product.querySelector('.badges__container');
      if(bd_co){
        if(html.querySelector(`.badges-item__sale`)){
          if(!bd_co.classList.contains('hide__badges-item__sale') && !bd_co.querySelector('.badges-item__sale')){
            bd_co.prepend(html.querySelector(`.badges-item__sale`));
          };
          bd_co.querySelector('.badges-item__sale')&&bd_co.querySelector('.badges-item__sale').classList.remove('hide');
          if(bd_co.querySelector('.badges-item__sale__counter')){
            bd_co.querySelector('.badges-item__sale__counter').innerHTML = html.querySelector('.badges-item__sale__counter').innerHTML;
          }
        }
        else{
          bd_co.querySelector('.badges-item__sale')&&bd_co.querySelector('.badges-item__sale').classList.add('hide');
        }
      }

      if(main_product.querySelectorAll('compare-button').length){
        main_product.querySelectorAll('compare-button').forEach((item) => {
          item.classList.remove('hide');
          item.setAttribute('data-id', requestedVariantId);
        });
        window.dispatchEvent(new CustomEvent('compareIdChanged'));
      }
      
      if(html.querySelector('#image')){
        if(main_product.querySelector('.swiper')){
          var src = main_product.querySelector(`.swiper .swiper-slide [data-main*="${html.querySelector('#image img').getAttribute('data-src')}"]`),
              ind = src.closest('[data-swiper-slide-index]').getAttribute('data-swiper-slide-index'),
              delay = 0;
          main_product.querySelector('.swiper').selectSlide(ind, delay);
        }
        else{
          if(main_product.querySelector('.product-card__image-secondary')){
            main_product.querySelector('.product-card__image-secondary').parentNode.innerHTML = html.querySelector('#image').innerHTML;
          }
          else{
            main_product.querySelector('.product-card__image-main img').setAttribute('src', html.querySelector('#image img').getAttribute('src'));
          }
          
          var aspect_ratio = html.querySelector('#image img').getAttribute('data-ratio');
          main_product.querySelector('.product-card__image-main').parentNode.style.setProperty('--aspect-ratio', aspect_ratio);
        }
      }

      if(main_product.querySelector('input[name="id"]'))main_product.querySelector('input[name="id"]').value = html.querySelector('input[name="id"]').value;

      requestedVariantId
    });
  }
  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1
    );
    const inputWrappers = this.querySelectorAll('.product-form__input');

    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }
  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }

      if(input.hasAttribute('data-option-text')){
        var t = input.getAttribute('data-option-text');
        if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
          if (input.text.includes(t)) {
            input.text = input.text.replace(` ${t}`, '');
          }
        } else {
          if (!input.text.includes(t)) {
            input.text += ` ${t}`;
          }
        }
      }
    });
  }
  setHtmlInfo(val,html){
    var main_product = this.closest('.product-card, .product-card-small'),
        item = main_product.querySelector(`#${val}-${this.getAttribute('data-product')}`);
    if(!item) return;
    item.classList.remove('hide');
    const item_source = html.getElementById(`${val}`);
    if (item){
      item.classList.remove('hidden');
      if (item_source) item.innerHTML = item_source.innerHTML;
    }
  }
  updateOptions() {
    if(this.querySelector('select')){
      this.querySelectorAll('.option-empty').forEach((item) => {
        var _p = item.parentNode;
        item.remove();
      });
      this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
    }
    else{
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));

      this.querySelectorAll('fieldset').forEach((item) => {
        if(!item.querySelector('input:checked')){
          item.querySelector('input:first-child').checked = true;
        }
      });
      
      this.options = fieldsets.map((fieldset) => {
        return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
      });
    }
  }
  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
    if(this.currentVariant.available || !this.classList.contains('hide_soldout_variants')) return true;


    if(this.options[2] != ""){
      this.currentVariant = this.getVariantData().find(item => 
        item['option1'] === this.options[0] && item['option2'] === this.options[1] && item.available === true
      );
      if (typeof this.currentVariant === 'undefined') {
        this.currentVariant = this.getVariantData().find(item => 
          item['option1'] === this.options[0] && item.available === true
        );
      }
    }
    else{
      this.currentVariant = this.getVariantData().find(item => 
        item['option1'] === this.options[0] && item.available === true
      );
    }
    this.querySelectorAll('fieldset').forEach((item, index) => {
      var i = index + 1,
          val = this.currentVariant[`option${i}`];
      item.querySelector(`input[value="${val}"]`).checked = true;
    });
    this.querySelectorAll('select').forEach((item, index) => {
      var i = index + 1;
      item.value = this.currentVariant[`option${i}`];
    });
  }
  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
  setUnavailable(){
    var main_product = this.closest('.product-card, .product-card-small'),
        card_form = main_product.querySelector(`#form-${this.getAttribute('data-product')}`);
    if(card_form){
      var button = card_form.querySelector('.quick-add__submit');
      button.setAttribute('disabled', 'disabled');
      button.setAttribute('aria-disabled', true);
      if(!card_form.querySelector('quantity-input')){
        button.querySelector('.btn__top-text').innerHTML = window.variantStrings.unavailable;
        button.querySelector('.btn__bottom-text').innerHTML = window.variantStrings.unavailable;
      }
    }

    var price = main_product.querySelector(`#price-${this.getAttribute('data-product')}`);
    price&&price.classList.add('hide');

    main_product.querySelector('.badges-item__sale')&&_product.querySelector('.badges-item__sale').classList.add('hide');
    main_product.querySelectorAll('compare-button').forEach((item) => {
      item.classList.add('hide');
    });
  }
}
customElements.define('card-variant-selects', cardVariantSelects);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange.bind(this));
    this.initMedia();
  }
  async onVariantChange(event) {
    if(this.querySelector('select')){
      this.variant_id = event.target.options[event.target.selectedIndex].dataset.variantId; 
    }
    else{
      this.variant_id = event.target.dataset.variantId;
    }
    if (!this.variant_id){
      this.toggleAddButton(true, '', true,`product-form-${this.dataset.section}`);
      this.setUnavailable();
    } else {
      await this.getProductInfo();
      this.updateMasterId();
      this.updateOptions();
      this.updatePickupAvailability();
      this.removeErrorMessage();
      this.updateVariantStatuses();

      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }
  async getProductInfo() {
    const requestedVariantId = this.variant_id;
    const sectionId = this.dataset.originalSection || this.dataset.section;
    const url = `${this.dataset.url}?variant=${requestedVariantId}&section_id=${sectionId}`;
    try {
      const response = await fetch(url);
      const responseText = await response.text();
      this.new_html = new DOMParser().parseFromString(responseText, 'text/html');
      const selector = 'variant-selects script[type="application/json"]';
      this.newJSON = this.new_html.querySelector(selector).textContent;
      const currentScript = this.querySelector(selector);
      if (this.newJSON && currentScript) {
        currentScript.textContent = this.newJSON;
      }
    } catch (error) {
      console.log('ERROR')
    }
  }
  initMedia(){
    var _parent = this.closest('.shopify-section')||this.closest('.popup-modal__content__data');
    var mediaGallery = _parent.querySelectorAll(`[data-current-color]`);
    if(mediaGallery.length && !_parent.querySelector('select-option-js.active')){
      var data_main_color = _parent.querySelector(`[data-main-color]`).getAttribute('data-main-color');
      _parent.querySelectorAll(`[data-main-color] [data-current-color]`).forEach((item) => {
        if(item.getAttribute('data-current-color') == data_main_color){
          if(item.closest('swiper-slider')){
            item.classList.add('swiper-slide');
          }
          item.classList.remove('hide');
        }
        else{
          if(item.closest('swiper-slider')){
            item.classList.remove('swiper-slide');
          }
          item.classList.add('hide');
        }
        item.classList.remove('color-first-item');
      });
      _parent.querySelectorAll(`[data-main-color]`).forEach((item) => {
        if(item.querySelectorAll(`[data-current-color="${data_main_color}"]`).length){
          item.querySelectorAll(`[data-current-color="${data_main_color}"]`)[0].classList.add('color-first-item');
        }
      });
      _parent.querySelectorAll(`swiper-slider`).forEach((item) => {
        typeof item.destroy         === 'function'&&item.destroy();
        typeof item.configureSwiper === 'function'&&item.configureSwiper();
        typeof item.initSwiper      === 'function'&&item.initSwiper();
      });
    }  
  }
  updateMedia(){
    if (!this.currentVariant) return;

    var _parent = this.closest('.shopify-section')||this.closest('.popup-modal__content__data');
    var mediaGallery = _parent.querySelectorAll(`[data-current-color]`);
    if(mediaGallery.length){
      var option1 = this.currentVariant.option1.toLowerCase();
      _parent.querySelectorAll(`[data-main-color] [data-current-color]`).forEach((item) => {
        var swiperslider = item.closest('swiper-slider');
        if(item.getAttribute('data-current-color') == option1){
          if(swiperslider){
            item.classList.add('swiper-slide');
          }
          item.classList.remove('hide');
        }
        else{
          if(swiperslider){
            item.classList.remove('swiper-slide');
          }
          item.classList.add('hide');
        }
        item.classList.remove('color-first-item');
      });
      _parent.querySelectorAll(`[data-main-color]`).forEach((item) => {
        if(item.querySelectorAll(`[data-current-color="${option1}"]`).length){
          var _item = item.querySelectorAll(`[data-current-color="${option1}"]`)[0];
          _item.classList.add('color-first-item');
        }
      });
      _parent.querySelectorAll(`swiper-slider`).forEach((item) => {
        item.destroy();
        item.configureSwiper();
        item.initSwiper();
        item.initPaginationCss();
      });
    }

    var swiper_slider_container = _parent.querySelector('swiper-slider-container')
    if (!this.currentVariant.featured_media || !swiper_slider_container) return;
    var _id = this.currentVariant.featured_media.id;
    _parent.querySelectorAll('swiper-slider-container').forEach((item) => {
      item.changeSlide(_id);
    });
  }
  getTop(el) {
    return el.offsetTop + (el.offsetParent && this.getTop(el.offsetParent));
  }
  scrollTo(to, duration) {
    const element = document.scrollingElement || document.documentElement,
          start = element.scrollTop,
          change = to - start,
    animateScroll = function() {
      element.scrollTop = to;
    };
    animateScroll();
  }
  
  updateOptions() {
    if(this.querySelector('select')){
      var newInputs = this.new_html.querySelectorAll('variant-selects .product-form__input select');
      var oldInputs = this.querySelectorAll('.product-form__input select');

      newInputs.forEach((newInput, index) => {
        const oldSelect = oldInputs[index];
        if (oldSelect) {
          const firstOpt = newInput.firstElementChild;
          if (firstOpt && firstOpt.classList.contains('option-empty')) {
            firstOpt.remove();
          }
          oldSelect.innerHTML = ''; 
          oldSelect.append(...newInput.childNodes);
          oldSelect.value = oldSelect.querySelector('option[selected]')?.value || oldSelect.value;
        }
      });
      this.querySelectorAll('select').forEach((item, index) => {
        var i = index + 1;
        item.value = this.currentVariant[`option${i}`];
      });
    }
    else{
      var newInputs = this.new_html.querySelectorAll('input.product-form__item__input');
      var oldInputs = this.querySelectorAll('input.product-form__item__input');
      newInputs.forEach((newInput, index) => {
        if (oldInputs[index]) {
          oldInputs[index].replaceWith(newInput);
        }
      });
    }
    const section = this.getParent();
    section?.querySelector('select-option-js')?.remove();
    section?.querySelector('.sticky-cart__select_options__text')?.classList.remove('sticky-cart__select_options__text');
  }
  getParent(){
    return this.closest('.shopify-section, .popup-modal__content__data');
  }
  updateMasterId() {
    this.currentVariant = this.getVariantData();
  }
  updatePickupAvailability() {
    const section = this.getParent();
    const pickUpAvailability = section.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.variant_id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }
  removeErrorMessage() {
    const section = this.getParent();
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }
  renderProductInfo(){
    const section = this.getParent();
    const html = this.new_html;
    this.setHtmlInfo('price-', html);
    this.setHtmlInfo('information-', html);
    this.setHtmlInfo('inventory-', html);
    this.setHtmlInfo('badge__container-', html);
    this.setHtmlInfo('Quantity-container-', html);
    var qua_co = section.querySelector(`#Quantity-container-${this.dataset.section}`);
    qua_co&&qua_co.init();

    const addButtonUpdated = html.querySelector(`#product-form-${this.dataset.section}`);
    const productForm = section.querySelector(`#product-form-${this.dataset.section}`);
    if(productForm){
      const addButtonNew = addButtonUpdated.querySelector('[name="add"]');
      const addButton = productForm.querySelector('[name="add"]');
      if(addButton){
        addButton.innerHTML = addButtonNew.innerHTML;
      }
      this.toggleAddButton(
        addButtonNew ? addButtonNew.hasAttribute('disabled') : true, window.variantStrings.soldOut
      );
    }
    this.deleteButtonSelectOptionOptional();

    if(section.querySelectorAll('compare-button').length){
      section.querySelectorAll('compare-button').forEach((item) => {
        item.classList.remove('hide');
        item.setAttribute('data-id', this.variant_id);
      });
      window.dispatchEvent(new CustomEvent('compareIdChanged'));
    }
    const sectionId = this.dataset.originalSection || this.dataset.section;
    publish(PUB_SUB_EVENTS.variantChange, {
      data: {
        sectionId,
        html,
        variant: this.currentVariant,
      },
    });
  }
  deleteButtonSelectOptionOptional(val){
    const section = this.getParent();
    const item = section.querySelector(`#theme-section-${this.dataset.section}`);
    if(!item.querySelector('.select-options-button')) return
    item.querySelector('.select-options-button').remove();
  }
  setHtmlInfo(val,html){
    const section = this.getParent();
    const item = section.querySelector(`#${val}${this.dataset.section}`);
    const item_source = html.querySelector(
      `#${val}${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
    );
    if (item){
      item.classList.remove('hidden');
      if (item_source) item.innerHTML = item_source.innerHTML;
    }
  }
  
  toggleAddButton(disable = true, text, modifyClass = true) {
    const section = this.getParent();
    const productForm = section.querySelector(`#product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text){
        addButton.querySelectorAll('[name="add"] .btn__texts__item').forEach((item) => {
          item.textContent = text;
        });
      }
    } else {
      addButton.removeAttribute('disabled');
    }

    if (!modifyClass) return;
  }
  updateVariantInput() {
    const section = this.getParent();
    const productForms = section.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.variant_id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  updateVariantStatuses() {
    const inputWrappers = this.querySelectorAll('.product-form__input');
    inputWrappers.forEach((option, index) => {
      this.setInputValue();
    });
  }
  setInputValue() {
    this.querySelectorAll('.field__input').forEach((input) => {
      input.closest('.product-form__input').querySelector('.variants-label__value').innerText = input.value;
    });
    this.querySelectorAll('.product-form__item__input:checked').forEach((input) => {
      input.closest('.product-form__input').querySelector('.variants-label__value').innerText = input.value;
    });
  }
  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false' || this.closest('#PopupModal-quickview')) return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.variant_id}`);
  }
  updateShareUrl() {
    const section = this.getParent();
    const shareButton = section.querySelector(`#Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.variant_id}`);
  }
  setUnavailable() {
    const section = this.getParent();
    const button = section.querySelector(`#product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');

    button.querySelectorAll('[name="add"] .btn__texts__item').forEach((item) => {
      item.textContent = window.variantStrings.unavailable;
    });

    this.hideUnavailableItem('price-');
    this.hideUnavailableItem('information-');
    this.hideUnavailableItem('inventory-');
    var _product = this.closest('.product-page-template');
    _product.querySelectorAll('compare-button').forEach((item) => {
      item.classList.add('hide');
    });
  }
  hideUnavailableItem(val){
    const section = this.getParent();
    const item = section.querySelector(`#${val}${this.dataset.section}`);
    if (item) item.classList.add('hidden');
  }
  getVariantData() {
    this.variantData = JSON.parse(this.newJSON) || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class ToggleAnimation extends HTMLElement {
  constructor() {
    super();
    if (this.classList.contains('admin-panel--no-js')) return;
    this.ACCORDION_CLASS = 'chm-toggle--accordion';
    this.TOGGLE_CLASS = 'chm-toggle';
    this.CONTENT_CLASS = 'chm-toggle__content';
    this.observer = null;
    this.init();
  }
  init() {
    this.clickEventHandler = this.clickEventHandler.bind(this);
    this.resizeHandler = this.resizeHandler.bind(this);
    this.handleMutations = this.handleMutations.bind(this);
    this.setupObserver();
    this.updateToggles();
    setTimeout(this.resizeHandler, 500);
    window.addEventListener('resize', this.resizeHandler);
  }
  setupObserver() {
    this.observer = new MutationObserver(this.handleMutations);
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }
  handleMutations(mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        this.updateToggles();
      }
    }
  }
  updateToggles() {
    if (this.boxes) {
      this.boxes.forEach(box => {
        box.removeEventListener('click', this.clickEventHandler);
      });
    }
    this.boxes = this.querySelectorAll('summary');
    if (this.boxes.length) {
      this.bindEvents();
    }
  }
  bindEvents() {
    this.boxes.forEach(box => {
      box.addEventListener('click', this.clickEventHandler);
    });
  }
  clickEventHandler(event) {
    event.preventDefault();
    const details = event.target.closest(`.${this.TOGGLE_CLASS}`);
    if (!details) return;

    if (details.hasAttribute('open')) {
      this.closeToggle(details);
    } else {
      this.openToggle(details);
    }

    if (this.classList.contains(this.ACCORDION_CLASS)) {
      this.closeOtherToggles(details);
    }
  }
  openToggle(details) {
    details.setAttribute('open', '');
    setTimeout(() => {
      this.resizeHandler();
      details.classList.add('toggle-opening');
      setTimeout(() => details.classList.add('toggle-opening-auto'), 400);
    }, 0);
  }
  closeToggle(details) {
    const transitionTime = this.getTransitionTime(details);
    details.classList.remove('toggle-opening', 'toggle-opening-auto');
    setTimeout(() => details.removeAttribute('open'), transitionTime);
  }
  closeOtherToggles(currentToggle) {
    const openToggles = this.querySelectorAll('[open]');
    openToggles.forEach(toggle => {
      if (toggle !== currentToggle) {
        setTimeout(() => this.closeToggle(toggle), 10);
      }
    });
  }
  resizeHandler() {
    const openContent = this.querySelectorAll('[open] .chm-toggle__content');
    openContent.forEach(content => {
      const toggle = content.closest('.chm-toggle');
      if (!toggle) return;
      toggle.classList.remove('toggle-opening-auto');
      toggle.style.setProperty('--duration-inline', `${this.getSpeed()}ms`);
      toggle.setAttribute('data-speed', this.getSpeed());
      content.style.setProperty('--scroll-height', `${content.scrollHeight + 1}px`);
      setTimeout(() => toggle.classList.add('toggle-opening-auto'), 400);
    });
  }
  getTransitionTime(element) {
    return element.hasAttribute('data-speed') ? Number(element.getAttribute('data-speed')) + 100 : 400;
  }
  getSpeed() {
    return 300;
  }
  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
    window.removeEventListener('resize', this.resizeHandler);
    
    if (this.boxes) {
      this.boxes.forEach(box => {
        box.removeEventListener('click', this.clickEventHandler);
      });
    }
  }
}
customElements.define('toggle-component', ToggleAnimation);

class GlobalTooltip extends HTMLElement {
  constructor() {
    super();
    if(!this.classList.contains('global__tooltip__static')){
      this.parentNode.addEventListener('mousemove', this.mousemove.bind(this))
    }
  }
  mousemove(e){
    this.style.top = (e.offsetY - this.offsetHeight - 10)+'px';
    this.style.left = (e.offsetX - this.offsetWidth / 2)+'px';
  }
}
customElements.define('global-tooltip', GlobalTooltip);

class VideoJs extends HTMLElement {
  constructor() {
    super();
    this.video = this.querySelector('video');
    this.muted = this.getAttribute("data-muted") == "true" ? true : false;
    this.initIntersectionObserver();
    if(this.getAttribute("data-buttons") == "true") {
      this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
        item.addEventListener("click", this.clickHandler.bind(this));
      });
      
      window.addEventListener(('stopPlayVideo'), (event) => {
        this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
          item.classList.remove("video-active");
        });
        this.video.pause();
      });
    }
    this.addEventListener('playVideo', this.playVideo.bind(this));
    this.addEventListener('stopVideo', this.stopVideo.bind(this));
    this.video.addEventListener('play', this.playHandler.bind(this));
    var video_on_hover = this.closest('.video_on_hover');
    video_on_hover&&video_on_hover.addEventListener('mouseover', this.playVideo.bind(this));
    video_on_hover&&video_on_hover.addEventListener('mouseout', this.stopVideo.bind(this));

    var _this = this;
    setTimeout(function(){
      var item = _this.closest('.submenu-design__megamenu');
      if(item){
        item.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'opacity') {
            const currentOpacity = window.getComputedStyle(item).opacity;
            if (currentOpacity === '0') {
              _this.stopVideo();
            }
            else{
              _this.playVideo();
            }
          }
        });
      }
    }, 1000);

    const modalDialog = document.querySelector('menumodal-dialog');
    if(!modalDialog) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const hadActive = mutation.oldValue?.includes('active');
          const hasActive = modalDialog.classList.contains('active');
          if (hadActive !== hasActive) {
            if (hasActive) {
              this.playVideo();
            } else {
              this.stopVideo();
            }
          }
        }
      });
    });
    observer.observe(modalDialog, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true
    });
  }
  initIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    };
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if(!this.video.classList.contains('played') && this.getAttribute("data-autoplay") == "true") {
            this.video.play();
            this.video.classList.add('played');
            this.classList.add('initialized');
          }
        } else {
          if(this.video.classList.contains('played') || this.getAttribute("data-autoplay") == "false") {
            this.video.classList.remove('played');
            this.video.pause();
            this.getAttribute("data-autoplay") == "false"&&this.stopVideo();
          }
        }
      });
    }, options);
    
    this.observer.observe(this.video);
  }
  playHandler(e) {
    this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
      item.classList.add("video-active");
    });
  }
  playVideo(e) {
    playVideo(this.video);
    this.classList.add('initialized');
  }
  stopVideo(e) {
    this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
      item.classList.remove("video-active");
    });
    this.video.pause();
  }
  clickHandler(e) {
    e.preventDefault();
    if(e.target.classList.contains("video-active")) {
      this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
        item.classList.remove("video-active");
      });
      this.video.pause();
    }
    else {
      window.dispatchEvent(new CustomEvent('stopPlayVideo'));
      this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
        item.classList.add("video-active");
      });
      this.video.play();
      this.classList.add('initialized');
    }    
  }
  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
customElements.define('video-js', VideoJs);

async function playVideo(videoElement) {
  try {
    await videoElement.play();
  } catch (err) {
    console.log('Playback error:', err);
  }
}

class VideoYoutubeJs extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("youtubeOnPlayerReady", this.youtubeOnPlayerReady.bind(this));
    this.addEventListener("youtubeOnPlayerStateChange", this.onPlayerStateChange.bind(this));

    if(this.getAttribute("data-buttons") == "true"){
      this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
        item.addEventListener("click", this.clickHandler.bind(this));
      });
      this.button_action = false;
      window.addEventListener(('stopPlayVideo'), (event) => {
        this.postMessageToPlayer(this.player, {
          "event": "command",
          "func": "pauseVideo"
        });
      });
    }
    this.addEventListener('playVideo', this.playVideo.bind(this));
    this.addEventListener('stopVideo', this.stopVideo.bind(this));
  }
  playVideo(e){
    this.postMessageToPlayer(this.player, {
      "event": "command",
      "func": "playVideo"
    });
  }
  stopVideo(e){
    this.postMessageToPlayer(this.player, {
      "event": "command",
      "func": "pauseVideo"
    });
  }
  clickHandler(e){
    e.preventDefault();
    if(this.button_action) return false;
    this.button_action = true;
    if(e.target.classList.contains("video-active")){
      this.postMessageToPlayer(this.player, {
        "event": "command",
        "func": "pauseVideo"
      });
    }
    else{
      window.dispatchEvent(new CustomEvent('stopPlayVideo'));
      this.postMessageToPlayer(this.player, {
        "event": "command",
        "func": "playVideo"
      });
    }
  }
  youtubeOnPlayerReady(e){
    this.player = this.querySelector("iframe");
    if(this.getAttribute("data-autoplay") == "true"){
      window.addEventListener('scroll', this.scrollHandler.bind(this));
      this.scrollHandler();
    }
  }
  onPlayerStateChange(e){
    this.classList.add('initialized');
    e.detail.state == 0&&this.player.classList.remove('played');
    e.detail.state == 0&&this.scrollHandler();
    if(this.getAttribute("data-autoplay") == "false"){
      if(e.detail.state == 1){//play
        this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
          item.classList.add("video-active");
        });
      }
      if(e.detail.state == 2){//pause
        this.closest('.section-media-buttons-parent').querySelectorAll('.section__video-media__ctrl--js').forEach((item) => {
          item.classList.remove("video-active");
        });
      }
      this.button_action = false;
    }
  }
  scrollHandler(){
    if(!this.closest('.swiper-slide-active') && this.closest('.swiper-slide')){
      return false;
    }
    
    var v = this.player,
        wp = window.scrollY,
        wh = window.innerHeight,
        p = v.getBoundingClientRect().top,
        h = v.offsetHeight,
        db = 20;

    if(p<wh+db && p>-h-db){
      if(!v.classList.contains('played')){
        this.postMessageToPlayer(v, {
          "event": "command",
          "func": "playVideo"
        });
        v.classList.add('played');
      }
    }
    else{
      if(v.classList.contains('played')){
        this.postMessageToPlayer(v, {
          "event": "command",
          "func": "pauseVideo"
        });
        v.classList.remove('played');
      }
    }
  }
  postMessageToPlayer(player, command){
    if (player == null || command == null) return;
    player.contentWindow.postMessage(JSON.stringify(command), "*");
  }
}
customElements.define('video-youtube-js', VideoYoutubeJs);

function onYouTubeIframeAPIReady() {
  document.querySelectorAll('.section__video-media__youtube').forEach((item) => {
      var id = item.querySelector("[id]").getAttribute("id"),
          vid_id = id.split('_____').shift(),
          mute = item.getAttribute("data-mute") == "true" ? 1 : 0;
      var player = new YT.Player(id, {
        height: '520',
        width: '980',
        videoId: vid_id,
        playerVars: {
          'playsinline': 1,
          'mute': mute,
          'controls':0,
          'fs':0,
          'iv_load_policy':3,
          'rel':0,
          'showinfo':0,
          'modestbranding':1,
          'loop':1,
          'autoplay':0
        },
        events: {
          'onReady': youtubeOnPlayerReady.bind("",item),
          'onStateChange': youtubeOnPlayerStateChange.bind("",item)
        }
    });
  })
  return true;
}
function youtubeOnPlayerReady(item, event) {
  item.dispatchEvent(new CustomEvent('youtubeOnPlayerReady'));
}
function youtubeOnPlayerStateChange(item, event) {
  var getDuration = event.target.getDuration();
  var getCurrentTime = event.target.getCurrentTime();
  item.dispatchEvent(new CustomEvent('youtubeOnPlayerStateChange', {detail: {state:event.data, getDuration:getDuration, getCurrentTime:getCurrentTime}}));
}
if(document.querySelectorAll('[data-type="youtube"]').length){
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}
class fullscreenObjectCollage extends HTMLElement {
  constructor() {
    super();
    this.bcollagegrid = this.querySelector('.bcollage-grid__container');
    this.resizeHandler();
    setTimeout(this.resizeHandler.bind(this), 500);
    window.addEventListener("resize", this.resizeHandler.bind(this), false);
  }
  resizeHandler(){
    var intViewportWidth = window.innerWidth,
    	intViewportHeight = window.innerHeight,
    	child = this.closest('section'),
        parent = child.parentNode,
        index = Array.prototype.indexOf.call(parent.children, child),
        breadcrumb = document.querySelectorAll('.breadcrumb');
    if(this.shouldUseFullHeight(intViewportWidth)){
      var __h = 0;
      if(index == 0 || index == 1 && breadcrumb.length){
        __h = intViewportHeight - this.offsetTop;
      }
      else{
        __h = intViewportHeight;
      }
      this.style.height = __h + 'px'
    }
    else{
      this.style.height = 'auto';
      if(this.bcollagegrid) this.bcollagegrid.style.height = 'auto';
	  }
  }
  shouldUseFullHeight(width) {
    if (width >= 1025) return this.hasAttribute('data-desktop');
    if (width >= 577) return this.hasAttribute('data-tablet');
    if (width <= 576) return this.hasAttribute('data-mobile');
    return true;
  }
}
customElements.define('fullscreen-object-collage', fullscreenObjectCollage);

class CountdownTimer extends HTMLElement {
  constructor() {
    super();
    var _date = this.getAttribute("data-end-date");
    var _d = _date.split(',');
    var countDownDate = new Date(_d[0],_d[1],_d[2],_d[3],_d[4],_d[5]).getTime();
    var _this = this;
    var x = setInterval(function() {
      var now = new Date().getTime();
      var distance = countDownDate - now;
      var days = Math.floor(distance / (1000 * 60 * 60 * 24));
      var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (distance <= 0) {
        clearInterval(x);
      }
      else{
        _this.querySelector(".countdown-timer__item__days").innerHTML = pad(days, 2);
        _this.querySelector(".countdown-timer__item__hours").innerHTML = pad(hours, 2);
        _this.querySelector(".countdown-timer__item__minutes").innerHTML = pad(minutes, 2);
        _this.querySelector(".countdown-timer__item__seconds").innerHTML = pad(seconds, 2);
      }
    }, 1000);
    function pad(num, size) {
      var s = String(num);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
    }
    setTimeout(this.timerActivated.bind(this), 1000)
  }
  timerActivated(){
    this.classList.add('timer-activated');
  }
}
customElements.define('countdown-timer', CountdownTimer);

class termsCheckboxHandler extends HTMLElement {
  constructor() {
    super();
    this.querySelector('input').addEventListener("change", this.changeHandler.bind(this), false);
  }
  changeHandler(event){
    event.target.checked ? this.classList.add('checked') : this.classList.remove('checked');
  }
}
customElements.define('terms_and_condition-checkbox', termsCheckboxHandler);

class showAllFacets extends HTMLElement {
  constructor() {
    super();
    this.parent = this.closest('.facets__display__content');
    this.classToWork = 'show-all-items';
    this.addEventListener('click', this.handler.bind(this), false);
  }
  handler(){
    if (this.parent.classList.contains(this.classToWork)) {
      this.parent.classList.remove(this.classToWork);
    }
    else{
      this.parent.classList.add(this.classToWork);
    }
    window.dispatchEvent(new Event('resize'));
  }
}
customElements.define('show-all-facets', showAllFacets);

class productTab extends HTMLElement {
  constructor() {
    super();
    this.resizeHandler = this._debounce(this.resizeHandler.bind(this), 100);
    window.addEventListener('resize', this.resizeHandler);
    this.resizeHandler();

    this.querySelector('.product-tab__heading').addEventListener('click', this.clickHandler.bind(this));
  }
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  clickHandler(e){   
    var el = this.querySelector('.product-tab__content');
    if(this.classList.contains('opened')){
      this.style.removeProperty('--height');
      this.classList.remove('opened');
    }
    else{
      if(this.classList.contains('product-tab--accordion')){
        var _index = Array.from(this.parentNode.children).indexOf(this);
        var tabs = [],
            values = [],
            temp = -1;
        this.parentNode.querySelectorAll('.product-tab--accordion').forEach((item) => {
          var cur_index = Array.from(item.parentNode.children).indexOf(item);
          if(cur_index == temp || temp == -1){
            temp = cur_index;
            values.push(cur_index);
            temp += 1;
          }
          else{
            tabs.push(values);
            values=[];
            temp = cur_index;
            values.push(cur_index);
            temp += 1;
          }
        });
        tabs.push(values);
    
        for(var i=0; i<tabs.length; i++){
          var __index = ','+_index+',';
          var arr = ','+tabs[i].join(',')+',';
          if(arr.indexOf(__index) > -1){
            for(var j=0; j<tabs[i].length; j++){
              this.parentNode.children[tabs[i][j]].style.removeProperty('--height');
              this.parentNode.children[tabs[i][j]].classList.remove('opened');
            }
          }
        }
      }
      this.style.setProperty('--height', `${el.scrollHeight}px`);
      this.classList.add('opened');
    }
  }
  resizeHandler(){
    if (this.classList.contains('opened')) {
      const el = this.querySelector('.product-tab__content');
      if (el) {
        const originalTransition = this.style.transition;
        this.style.transition = 'none';
        
        this.style.setProperty('--height', 'auto');
        const newHeight = el.scrollHeight;

        this.style.transition = originalTransition;
        this.style.setProperty('--height', `${newHeight}px`);
      }
    }
  }
}
customElements.define('product-tab', productTab);

class zoomIcon extends HTMLElement {
  constructor() {
    super();
    this.parentElement.addEventListener("mousemove", this.mousemove.bind(this));
  }
  mousemove(e){
    if(window.innerWidth <= 1024) return false;
    this.style.top = (e.offsetY - Math.round(this.clientHeight/2))+'px';
    this.style.left = (e.offsetX - Math.round(this.clientWidth/2))+'px';
  }
}
customElements.define('zoom-icon', zoomIcon);

function isTouchDevice(){
  return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
}

document.querySelectorAll(".enable-scrollbar-js").forEach((item) => {
  item.addEventListener('mouseenter', function(e){
    var item = this.querySelector('.scrollbar-height-js');
    item.style.maxHeight = `${ window.innerHeight - item.getBoundingClientRect().top - 20}px`;
  }, false);
});
class headerDesktop extends HTMLElement {
  constructor() {
    super();

    document.querySelectorAll(".enable-scrollbar-megamenu-js").forEach((item) => {
      this.init(item);
      this.events(item);
    });

    var _this = this;
    _this.addEventListener('mousemove', mousemoveHeaderNavHandler, false);
    function mousemoveHeaderNavHandler(){
      _this.removeEventListener('mousemove', mousemoveHeaderNavHandler, false);
      _this.querySelectorAll(`tag-image`).forEach((item) => {
        const img = item.querySelector('img');
        if(img.hasAttribute('data-main')){
          const size = item.getSize();
          if(!size) return;
          img.src = size;
          img.removeAttribute('loading')
        }
      });
    }

    if(this.querySelector('.header-phone-number__desktop__on-click')){
      this.querySelector('.header-phone-number__desktop__container').addEventListener('mouseleave', this.phoneMouseleaveHandler.bind(this), false);
      this.querySelector('.header-phone-number__desktop__on-click').addEventListener('click', this.phoneClickHandler.bind(this), false);
    }
  }
  phoneMouseleaveHandler(e){
    e.preventDefault();
    e.target.querySelector('.header-phone-number__desktop__on-click').classList.remove('active');
  }
  phoneClickHandler(e){
    e.preventDefault();
    e.target.classList.toggle('active');
  }
  init(item){
  }
  events(item){
    item.addEventListener('mouseenter', this.mouseenterHandler.bind(this), false);
  }
  mouseenterHandler(e){
    this.resizeMegamenu(e.currentTarget.nextElementSibling.querySelector('.scrollbar-height-megamenu-js'));
  }
  resizeMegamenu(item){
    document.querySelector('.section-header').style.setProperty('--megamenu-bg-height', `${0}px`);
    if(item.closest('.header__section-background__boxed')){
      item.style.maxHeight = `${Math.round(window.innerHeight - item.getBoundingClientRect().top + 24 - (this.classList.contains('admin-select-menu-item')?64:40))}px`;
    }
    else{
      item.style.maxHeight = `${Math.round(window.innerHeight - item.getBoundingClientRect().top + 24 - (this.classList.contains('admin-select-menu-item')?24:0))}px`;
    }
    document.querySelector('.section-header').style.setProperty('--megamenu-bg-height', `${document.documentElement.scrollHeight - item.getBoundingClientRect().top + 23}px`);
  }
}
customElements.define('header-desktop', headerDesktop);

class externalSearchContent extends HTMLElement {
  constructor() {
    super();
    
    var html = document.querySelector('.header-modal-search__external-content');
    if(html){
      html.innerHTML = this.innerHTML;
    }
  }
}
customElements.define('external-searchcontent', externalSearchContent);

class externalMegamenuContent extends HTMLElement {
  constructor() {
    super();
    this.init();
    Shopify.designMode&&window.addEventListener('reinit_megamenu', this.init.bind(this));
  }
  init(){
    var item2 = document.querySelectorAll('[data-parent-megamenu] [data-megamenu-index]');
    if(item2.length){
      item2.forEach((elem) => {
        elem.remove();
      });
    }
    
    this.querySelectorAll('[data-name]').forEach((item) => {
      var name = item.getAttribute('data-name');
      var megamenu = document.querySelector(`[data-parent-megamenu=${name}]`);
      if(megamenu){
        Array.from(item.children).forEach((elem, index) => {
          if(elem.classList.contains('fake-links')){
            var el = elem.children[0];
            var style = el.hasAttribute('style')?el.getAttribute('style'):"";
            Array.from(megamenu.children)[index].setAttribute('style', style);
          }
          else{
            var elem2 = this.detach(elem);
            elem2.setAttribute('data-megamenu-index', index);
            if(elem2.children.length > 0){
              elem2.children[0].hasAttribute('style')&&elem2.setAttribute('style', elem2.children[0].getAttribute('style'));
            }
            megamenu.appendChild(elem2);
          }
        });
        megamenu.querySelectorAll('.fake-links').forEach((elem) => {
          elem.remove();
        });
        megamenu.querySelectorAll('[data-megamenu-index]').forEach((elem) => {
          var index = Number(elem.getAttribute('data-megamenu-index'));
          this.changeIndexPosition(megamenu, elem, index);
        });
        megamenu.querySelectorAll('[clip-path]').forEach((elem) => {
          var str = this.generateRandomString(10);
          var mainstr = elem.getAttribute('clip-path');
          mainstr = mainstr.replace(')', `${str})`);
          elem.setAttribute('clip-path', mainstr);
          elem.parentNode.querySelector('clipPath').setAttribute('id', mainstr.replace(')', '').replace('url(#', ''));
        });
        Shopify.designMode && document.querySelectorAll('.admin-select-menu-item').forEach((elem) => {
          elem.dispatchEvent(new Event('mouseenter', { bubbles: true }));
        });
      }
    })
  }
  generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  detach(node) {
    if (Shopify.designMode) {
      return node.cloneNode(true);
    }
    else{
      return node.parentElement.removeChild(node);
    }
  }
  changeIndexPosition(parent, child, targetIndex){
    const children = Array.from(parent.children);
    if (targetIndex >= 0 && targetIndex < children.length) {
      const referenceNode = children[targetIndex];
      parent.insertBefore(child, referenceNode);
    }
  }
}
customElements.define('external-megamenucontent', externalMegamenuContent);

class tagImage extends HTMLElement {
  constructor() {
    super();
    this.image = this.querySelector('img');
    if(!this.image.hasAttribute('data-main')) return;
    this.image_src = this.image.getAttribute('data-main');
    this.lastWidth = 0;
    this.resizeThrottle = null;
    this.init();
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeThrottle);
      this.resizeThrottle = setTimeout(() => this.resize(), 100);
    });
    window.addEventListener('reresizeimage', () => {
      clearTimeout(this.resizeThrottle);
      this.resizeThrottle = setTimeout(() => this.resize(), 100);
    });
    this.image.addEventListener('load', function() {
      this.getAttribute('src').indexOf('data:') == -1 && this.classList.add('image-loaded');
    });
  }

  init() {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (!img.classList.contains('image-loaded')) {
            requestAnimationFrame(() => {
              const size = this.getSize();
              if (!size) return;
              img.src = size;
            });
          }
          observer.unobserve(img);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    observer.observe(this.image);
  }

  resize() {
    if (!this.image.classList.contains('image-loaded')) return;
    const currentWidth = window.innerWidth;
    if (Math.abs(currentWidth - this.lastWidth) < 50) return;
    this.lastWidth = currentWidth;
    requestAnimationFrame(() => {
      const size = this.getSize();
      if (!size) return;
      this.image.setAttribute('src', size);
    });
  }

  getSize(value) {
    if (this._cachedSize && !value && this._cachedWidth === window.innerWidth) {
      return this._cachedSize;
    }
    let w;
    if (value) {
      w = value;
    } else {
      w = Math.round(this.offsetWidth || this.getBoundingClientRect().width);
    }
    if (w === 0) return false;
    const isRetina = window.devicePixelRatio >= 1.5;
    if (window.innerWidth > 1024) {
      w = isRetina ? w * 2 : w + 40;
    } else {
      w = isRetina ? w * 2 : w + 40;
    }
    const result = String(this.image_src).replace("width=50", `width=${w}`);
    if (!value) {
      this._cachedWidth = window.innerWidth;
      this._cachedSize = result;
    }
    return result;
  }
  attributeChangedCallback() {
    this._cachedSize = null;
    this._cachedWidth = null;
  }
}
customElements.define('tag-image', tagImage);

class mediaButtonsEvent extends HTMLElement {
  constructor() {
    super();
    this.events();
    this.links_inited = false;
  }
  init(key, id){
    const existingData = localStorage.getItem(key);
    let dataMap = {};
    if (existingData) {
      dataMap = JSON.parse(existingData);
      if(dataMap.hasOwnProperty(id) && !this.classList.contains('delete-item-button')){
        this.classList.add('active');
      }
    }
  }
  events(){
    this.addEventListener("click", this.clickEvent.bind(this));
  }
  clickEvent(e){
    if(this.classList.contains('active')){
      this.classList.remove('active')
    }
    else{
      this.classList.add('active')
    }
    this.clickEventHandler(e);
  }
  clickEventHandlerMain(e, key){
    const id = this.getAttribute('data-id');
    const productHandle = this.getAttribute('data-product-handle');
    const existingData = localStorage.getItem(key);
    let dataMap = {};
    if (existingData) {
      dataMap = JSON.parse(existingData);
      if(dataMap.hasOwnProperty(id)){
        delete dataMap[id];
        this.deactivateAnotherSameItems(id);
        if(this.classList.contains('delete-item-button')){
          this.deleteItem();
        }
      }
      else{
        dataMap[id] = productHandle;
        this.activateAnotherSameItems(id);
      }
    }
    else{
      dataMap[id] = productHandle;
      this.activateAnotherSameItems(id);
    }
    Object.keys(dataMap).length === 0?localStorage.removeItem(key):localStorage.setItem(key, JSON.stringify(dataMap));
  }
  initBubble(key){
    const existingData = localStorage.getItem(key);
    if (existingData && this.links_inited == false) {
      const dataMap = JSON.parse(existingData);
      var handles = '';
      for (let key in dataMap) {
        if (dataMap.hasOwnProperty(key)) {
          handles += dataMap[key] + '||';
        }
      }
      fetch(`${window.routes.all_products_collection_url}?view=wi_co_alive_links&sort_by=${handles}`)
      .then((response) => response.text())
      .then((responseText) => {
        if(responseText == ""){
          this.firstElementChild.innerHTML = Object.keys(dataMap).length;
        }
        else{
          const filteredData = Object.fromEntries(
            Object.entries(dataMap).filter(([key, value]) => 
              !responseText.includes(value)
            )
          );
          if(Object.keys(filteredData).length === 0){
            localStorage.removeItem(key);
            this.firstElementChild.innerHTML = this.hasAttribute('class')?'':0;
          }
          else{
            localStorage.setItem(key, JSON.stringify(filteredData));
            this.firstElementChild.innerHTML = Object.keys(filteredData).length;
          }
        }
      });
      this.links_inited = true;
    }
    else if (existingData) {
      const dataMap = JSON.parse(existingData);
      this.firstElementChild.innerHTML = Object.keys(dataMap).length;
    }
    else{
      this.firstElementChild.innerHTML = this.hasAttribute('class')?'':0;
    }
  }
}
class wishlistButton extends mediaButtonsEvent {
  constructor() {
    super();
    this.init('productDataWishlist', this.getAttribute('data-id'));
  }
  clickEventHandler(e){
    this.clickEventHandlerMain(e, 'productDataWishlist');
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new CustomEvent('wishlistUpdated', {detail: {target: e.currentTarget}}));
  }
  activateAnotherSameItems(id){
    document.querySelectorAll(`wishlist-button[data-id="${id}"]`).forEach((item) => {
      item.classList.add('active');
    });
  }
  deactivateAnotherSameItems(id){
    document.querySelectorAll(`wishlist-button[data-id="${id}"]`).forEach((item) => {
      item.classList.remove('active');
    });
  }
  deleteItem(){
    var item = this.closest('.product-card');
    item.classList.add('delete-item');
    setTimeout(function(){item.remove()}, 300);
  }
}
customElements.define('wishlist-button', wishlistButton);
class wishlistBubble extends mediaButtonsEvent {
  constructor() {
    super();
    this.init();
    window.addEventListener('wishlistUpdated', this.init.bind(this));
  }
  init(){
    this.initBubble('productDataWishlist');
  }
}
customElements.define('wishlist-bubble', wishlistBubble);
class wishlistPage extends HTMLElement {
  constructor() {
    super();
    this.empty = this.querySelector('.wishlist-is-empty');
    this.main = this.querySelector('.wishlist-content');
    this.settings = this.getAttribute('data-settings');
    this.init();
    window.addEventListener('wishlistUpdated', this.init.bind(this));
  }
  init(e){
    let isbutton_remove = e&&e.detail.target.className.indexOf('delete-item-button')>-1;
    const existingData = localStorage.getItem('productDataWishlist');
    if (existingData) {
      this.empty.classList.add('hide');
      !isbutton_remove&&this.createpage();
      this.main.classList.remove('hide');
    }
    else{
      this.empty.classList.remove('hide');
      this.main.classList.add('hide');
    }
  }
  createpage(){
    const existingData = localStorage.getItem('productDataWishlist');
    if (!existingData) return false;

    var handles = '';
    const dataMap = JSON.parse(existingData);
    for (let key in dataMap) {
      if (dataMap.hasOwnProperty(key)) {
        handles += dataMap[key] + '||';
      }
    }
    this.load(handles);
  }
  load(handle){
    var _this = this;
    fetch(`${window.routes.all_products_collection_url}?view=wishlist_ajax&sort_by=${handle+this.settings}`)
      .then((response) => response.text())
      .then((responseText) => {
        _this.querySelector('.wishlist-ajax-content').innerHTML = responseText;
      });
  }
}
customElements.define('wishlist-page', wishlistPage);

class compareButton extends mediaButtonsEvent {
  constructor() {
    super();
    this.parent = this.closest('.wokiee-compare');
    this.init('productDataCompare', this.getAttribute('data-id'));
    window.addEventListener('compareIdChanged', this.compareIdChanged.bind(this));
  }
  clickEventHandler(e){
    this.clickEventHandlerMain(e, 'productDataCompare');
    window.dispatchEvent(new CustomEvent('compareUpdated', {detail: {target: e.currentTarget}}));
  }
  activateAnotherSameItems(id){
    document.querySelectorAll(`compare-button[data-id="${id}"]`).forEach((item) => {
      item.classList.add('active');
    });
  }
  deactivateAnotherSameItems(id){
    document.querySelectorAll(`compare-button[data-id="${id}"]`).forEach((item) => {
      item.classList.remove('active');
    });
  }
  compareIdChanged(){
    this.classList.remove('active');
    this.init('productDataCompare', this.getAttribute('data-id'));
  }
  deleteItem(){
    var item_value = this.closest('[data-item]').getAttribute('data-item');
    this.parent.querySelectorAll(`[data-item="${item_value}"]`).forEach((item) => {
      item.classList.add('delete-item');
    });
    var _this = this;
    setTimeout(function(){
      _this.parent.querySelectorAll(`[data-item="${item_value}"]`).forEach((item) => {
        item.remove()
      });
      _this.parent.querySelector('.wokiee-compare__count__number').innerHTML = _this.parent.querySelectorAll('.wokiee-compare__container')[0].children.length;
      window.dispatchEvent(new CustomEvent('compareItemDeleted'));
    }, 300);
  }
}
customElements.define('compare-button', compareButton);
class compareBubble extends mediaButtonsEvent {
  constructor() {
    super();
    this.init();
    window.addEventListener('compareUpdated', this.init.bind(this));
  }
  init(){
    this.initBubble('productDataCompare');
  }
}
customElements.define('compare-bubble', compareBubble);

!(!!navigator.platform.match(/iPhone|iPod|iPad/) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)) && document.documentElement.classList.add('apple-device');

class HeaderDrawer extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.timeoutclose = false;
    if(this.querySelector(".admin-select-menu-item")){
      this.querySelector(".vertical-menu").classList.add("menu-opening");
      this.querySelector(".vertical-menu").setAttribute("open", true);
    }    
  }
  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.closest('details');
    const isOpen = detailsElement.hasAttribute('open');
    if (isOpen) event.preventDefault();
    isOpen ? this.closeMenuDrawer(event, detailsElement) : this.openMenuDrawer(detailsElement);
  }
  openMenuDrawer(detailsElement) {
    setTimeout(() => {
      detailsElement.classList.add('menu-opening');
    });
  }
  closeMenuDrawer(event, detailsElement) {
    detailsElement.classList.remove('menu-opening');
    clearTimeout(this.timeoutclose);
    this.timeoutclose = setTimeout(() => {
      detailsElement.removeAttribute('open');
    }, 300);
  }
}
customElements.define('header-drawer', HeaderDrawer);
class megamenuSize extends HTMLElement {
  constructor() {
    super();
    window.addEventListener('resize', this.resize.bind(this));
    this.resize();
  }
  resize(){
    var _width = this.querySelector(".vertical-menu__items").offsetWidth,
        _full_width = this.parentNode.offsetWidth;
    this.querySelectorAll('.submenu-design__megamenu').forEach((item) => {
      item.style.width = `${Math.round(_full_width - _width - 5)}px`;
    });
  }
}
customElements.define('megamenu-size', megamenuSize);

class StickyHeader extends HTMLElement {
  constructor() {
    super();
    this._handleScroll = this._handleScroll.bind(this);
    this._handleResize = this._handleResize.bind(this);
    this._handleIntersection = this._handleIntersection.bind(this);
    this.currentScrollTop = 0;
    this.rafId = null;
    this.isIntersecting = false;
    this.top_bar_height = 0;
    this.headerHeight = 0;
  }

  connectedCallback() {
    this.header = this.parentNode.querySelector('header');
    this.section_header = this.closest('.section-header');
    this.top_bar = this.header.querySelector('.header__top-bar');
    
    this._initObserver();
    this.init();
    this.update();
    
    window.addEventListener('resize', this._handleResize, { passive: true });
    window.addEventListener('scroll', this._handleScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._handleResize);
    window.removeEventListener('scroll', this._handleScroll);
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  _initObserver() {
    this.observer = new IntersectionObserver(this._handleIntersection, {
      rootMargin: '-1px 0px 0px 0px',
      threshold: [0, 1]
    });
    this.observer.observe(this.section_header);
  }

  _handleIntersection(entries) {
    const entry = entries[0];
    this.isIntersecting = entry.isIntersecting;
  }

  _handleScroll() {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.update();
      this.rafId = null;
    });
  }

  _handleResize() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.init();
      this.update();
      this.rafId = null;
    });
  }

  init() {
    this.classList.add('stickyinit');
    this.classList.remove('stickyinit');
    this.top_bar_height = this.top_bar ? this.top_bar.offsetHeight : 0;

    const _header = this.header.querySelector('.header');
    const sectionName = this.parentNode.querySelector('[data-section-name]')?.getAttribute('data-section-name');
    
    if (sectionName === "header-layout-tiles") {
      this.top_bar_height += _header.offsetHeight;
    }
    
    if (_header.classList.contains('bottom-menu-to')) {
      const headingHeight = _header.querySelector('.header__heading')?.offsetHeight || 0;
      const iconsHeight = _header.querySelector('.header__icons')?.offsetHeight || 0;
      this.top_bar_height += Math.max(headingHeight, iconsHeight) + 10;
    }

    const isDesktop = window.innerWidth > 1024;
    const suffix = isDesktop ? '__desktop' : '__mobile';
    const isEnabled = [...this.classList].some(cls => cls.includes(suffix));
    if (isEnabled) {
      this.headerHeight = this.section_header.offsetHeight;
      if (isDesktop) {
        this.headerHeight -= (this.top_bar_height || 0);
      }
    }

    if(isDesktop){
      isEnabled && this.section_header.style.setProperty("top", `${this.top_bar_height * -1 - 1}px`);
    }
    else{
      this.section_header.style.setProperty("top", `0px`);
    }

    if (this.classList.contains("sticky-header-scroll")) {
      this.section_header.style.setProperty("--top-offset", `${this.section_header.offsetHeight * -1 - 50}px`);
    }

    this.classList.add('sticky-header__inited');
  }

  update() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const threshold = this.section_header.offsetTop + this.top_bar_height;
    const root = document.documentElement;

    if (this.classList.contains("sticky-header-scroll")) {
      if (threshold <= scrollTop && this.currentScrollTop >= scrollTop) {
        this.classList.add('sticky-active');
        root.style.setProperty('--header-height', `${this.headerHeight}px`);
      } else {
        this.classList.remove('sticky-active');
        root.style.setProperty('--header-height', `0px`);
      }
    } else {
      if (threshold < scrollTop) {
        this.classList.add('sticky-active');
        root.style.setProperty('--header-height', `${this.headerHeight}px`);
      } else {
        this.classList.remove('sticky-active');
        root.style.setProperty('--header-height', `0px`);
      }
    }
    this.classList.toggle('sticky-activated', threshold < scrollTop || this.headerHeight < scrollTop  );

    this.currentScrollTop = scrollTop;
  }
}
if (document.readyState === 'complete') {
  customElements.define('sticky-header', StickyHeader);
}
else{
  window.addEventListener('load', () => {
    customElements.define('sticky-header', StickyHeader);
  });
}


class stickyHeadervertical extends HTMLElement {
  constructor() {
    super();
    this.header = this.parentNode.querySelector('header');
    this.section_header = this.closest('.section-header');
    this.clonedHeader = false;
    this.init();
    window.addEventListener('resize', this.init.bind(this), false);
    window.addEventListener('scroll', this.update.bind(this), false);
    this.headerHeight = 0;
  }
  init(){
    this.classList.add('stickyinit');
    this.headerBottom = this.section_header.offsetTop;
    this.classList.remove('stickyinit');
    if(window.innerWidth <= 1024){
      this.top_bar_height = this.top_bar ? this.top_bar.offsetHeight : 0;
      var _header = this.header.querySelector('.header');
      if(this.parentNode.querySelector('[data-section-name]').getAttribute('data-section-name') == "header-layout-tiles"){
        this.top_bar_height += _header.offsetHeight;
      }
      if(_header.classList.value.indexOf('bottom-menu-to') > -1){
        this.top_bar_height += Math.max(_header.querySelector('.header__heading')?_header.querySelector('.header__heading').offsetHeight:0, _header.querySelector('.header__icons')?_header.querySelector('.header__icons').offsetHeight:0) + 10;
      }
      this.section_header.style.setProperty("top", `${this.top_bar_height * -1 - 1}px`);
    }
    else{
      this.section_header.style.removeProperty("top");
    }

    const isDesktop = window.innerWidth > 1024;
    const suffix = isDesktop ? '__desktop' : '__mobile';
    const isEnabled = [...this.classList].some(cls => cls.includes(suffix));
    if (isEnabled) {
      this.headerHeight = this.section_header.offsetHeight;
      if (isDesktop) {
        this.headerHeight -= (this.top_bar_height || 0);
      }
    }

    this.classList.add('sticky-header__inited');
  }
  update(){
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const root = document.documentElement;
    var tocheck = this.headerBottom,
        v_menu = this.section_header.querySelector('.vertical-menu');
    if(v_menu.hasAttribute('open') || v_menu.hasAttribute('data-menu-opened')){
      var h = v_menu.querySelector('.vertical-menu__container').offsetHeight;
      tocheck += h + this.section_header.offsetHeight;
    }

    if(tocheck < scrollTop && window.innerWidth > 1024 && this.className.indexOf('__desktop') > -1){
      if(!this.clonedHeader){
        this.clonedHeader = this.cloneElementWithEvents(this.header.querySelector('.header__main'));
        this.clonedHeader.querySelector('[data-menu-opened]')&&this.clonedHeader.querySelector('[data-menu-opened]').removeAttribute('data-menu-opened');
        this.clonedHeader.querySelector('[open]')&&this.clonedHeader.querySelector('[open]').removeAttribute('open');
        this.clonedHeader.querySelector('[hide-before-load]')&&this.clonedHeader.querySelector('[hide-before-load]').removeAttribute('hide-before-load');
        this.clonedHeader.classList.add('vertical-sticky');
        this.header.querySelector('.header__main').parentNode.append(this.clonedHeader);
      }
      this.clonedHeader.classList.add('sticky-active-works');
    }
    if(tocheck < scrollTop && this.currentScrollTop > scrollTop){
      if(this.clonedHeader && window.innerWidth > 1024){
        this.clonedHeader.classList.add('sticky-active');
      }
      else{
        this.classList.add('sticky-active');
      }
      root.style.setProperty('--header-height', `${this.headerHeight}px`);
    }
    else{
      if(this.clonedHeader && window.innerWidth > 1024 && this.className.indexOf('__desktop') > -1){
        if(tocheck >= scrollTop){
          this.clonedHeader.classList.remove('sticky-active-works');
        }
        this.clonedHeader.classList.remove('sticky-active');
        this.clonedHeader.querySelector('.vertical-menu').removeAttribute('open');
        this.clonedHeader.querySelector('.vertical-menu').classList.remove('menu-opening');
      }
      else{
        this.classList.remove('sticky-active');
      }
      root.style.setProperty('--header-height', `0px`);
    }
    this.classList.toggle('sticky-activated', tocheck < scrollTop);
    this.currentScrollTop = scrollTop;
  }
  cloneElementWithEvents(element) {
    const clone = element.cloneNode(true);
    if (typeof getEventListeners === 'function') {
      const listeners = getEventListeners(element);
      for (const eventType in listeners) {
        listeners[eventType].forEach(listener => {
          clone.addEventListener(eventType, listener.listener, listener.options);
        });
      }
    }
    return clone;
  }
}
customElements.define('sticky-headervertical', stickyHeadervertical);

class fixedHeaderGroup extends HTMLElement {
  constructor() {
    super();

    if(this.querySelector('[data-section-name="header-layout-tiles"]')){
      this.unwrap(this);
      return;
    }
    if(this.querySelector('[data-section-name="header-layout-vertical"]')){
      this.unwrap(this);
      return;
    }

    this.desktop = this.hasAttribute('data-transparent-desktop');
    this.mobile = this.hasAttribute('data-transparent-mobile');
    window.addEventListener('resize', this.resize.bind(this), false);
    this.resize();
  }
  resize(){
    if(window.innerWidth > 1024){
      if(!this.desktop && document.querySelector('fixed-headergroup')){
        this.unwrap(this);
      }
    }
    else{
      if(!this.mobile && document.querySelector('fixed-headergroup')){
        this.unwrap(this);
      }
    }
  }
  unwrap(wrapper) {
    const parent = wrapper.parentNode;
    while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);
  }
}
customElements.define('fixed-headergroup', fixedHeaderGroup);

class CollectionsTabs extends HTMLElement {
  constructor() {
    super();
    this.settings = this.getAttribute("data-settings");
    this.data_ajax = this.getAttribute("data-ajax");
    this.featured_col_tabs = this.parentNode.querySelector('featured-tabs-content');
    this.querySelectorAll('.featured-tabs__item').forEach(
      (button) => {
        button.addEventListener('click', this.onTabClick.bind(this));
        button.addEventListener('keydown', (event) => {
          event.code.toUpperCase() == "ENTER"&&event.currentTarget.dispatchEvent(new Event('click'));
        });
      }
    );
    this.onTabClickHandler(this.querySelector('.active'));
  }
  onTabClick(e){
    e.preventDefault();
    var current_target = e.currentTarget;
    this.onTabClickHandler(current_target);
  }
  onTabClickHandler(current_target){
    current_target.parentNode.querySelector(".active").classList.remove("active");
    current_target.classList.add("active");

    var _this = this;
    var data_index = current_target.getAttribute('data-index');
    var data_obj = this.settings + current_target.getAttribute('data-settings');
    var handle = current_target.getAttribute('data-handle');

    if(this.featured_col_tabs.querySelector('[data-index="'+data_index+'"]')){
      this.featured_col_tabs.querySelector('.active').classList.add('tab__smooth_hide');
      setTimeout(function(){
        _this.featured_col_tabs.querySelectorAll('.active').forEach((item) => {
          item.classList.remove('tab__smooth_hide');
          item.classList.remove('active');
        });
        _this.featured_col_tabs.querySelector('[data-index="'+data_index+'"]').classList.add('active');
        _this.featured_col_tabs.querySelector('[data-index="'+data_index+'"]').classList.add('tab__smooth_hide');
        setTimeout(function(){
          _this.featured_col_tabs.querySelector('[data-index="'+data_index+'"]').classList.add('tab__smooth_show');
          setTimeout(function(){
            _this.featured_col_tabs.querySelector('[data-index="'+data_index+'"]').classList.remove('tab__smooth_hide');
            _this.featured_col_tabs.querySelector('[data-index="'+data_index+'"]').classList.remove('tab__smooth_show');
            
          }, 300);
        }, 10);
        window.dispatchEvent(new CustomEvent('reresizeimage'));
      }, 250);
    }
    else{
      this.getProducts(handle, data_obj, data_index);
    }
  }
  getProducts(handle, data_obj, data_index){
    var _this = this;
    fetch(`${window.routes.collections_url}/${handle}?view=${this.data_ajax}&sort_by=${data_obj}`)
      .then((response) => response.text())
      .then((responseText) => {
        this.featured_col_tabs.querySelectorAll('.active').forEach((item) => {
          item.classList.remove('tab__smooth_hide');
          item.classList.remove('active');
        });
        var content = document.createElement('div');
        content.classList.add('active');
        content.classList.add('tab__smooth_hide');
        content.classList.add('featured-tab-products');
        content.setAttribute('data-handle-loaded', handle);
        content.setAttribute('data-index', data_index);
        content.setAttribute('role', "tabpanel");
        content.innerHTML = responseText;
        this.featured_col_tabs.appendChild(content);
        setTimeout(function(){
          content.classList.add('tab__smooth_show');
          setTimeout(function(){
            content.classList.remove('tab__smooth_hide');
            content.classList.remove('tab__smooth_show');
            window.dispatchEvent(new CustomEvent('reresizeimage'));
          }, 300);
        }, 10);
    })
  }
}
customElements.define('featured-tabs', CollectionsTabs);

(!!navigator.platform.match(/iPhone|iPod|iPad/) || Shopify.designMode) && import("@theme/module-change-svg-id").then((module) => { module.changeSvgId() });
document.querySelectorAll(".section-background__elements__item").length > 0 && import("@theme/module-parallax").then((module) => { module.startParallax() });

class mapSectionHandler extends HTMLElement {
  constructor() {
    super();
    this.map_src = "https://maps.googleapis.com/maps/api/js?sensor=false&key="+this.getAttribute('data-api-key');
    this.zoom_level = this.getAttribute('data-zoom-level');
    this.map_address = this.getAttribute('data-map-address');
    this.show_pin = this.getAttribute('data-show-pin') == "true"?true:false;

	  window.addEventListener('mapLoaded', this.initMap.bind(this), false);
    
    var scripts = document.querySelectorAll('[src*="'+this.map_src+'"]');
    if(!scripts.length || Shopify.designMode) this.loadMapScript();
  }
  loadMapScript(){
    var map_script = document.createElement('script');
    map_script.setAttribute('src',this.map_src);
    this.parentElement.appendChild(map_script);
    map_script.onload = () => {
      window.dispatchEvent(event_map_loaded);
    }
  }
  initMap(){
    var show_pin = this.show_pin;
    var mapOptions = {
      zoom: Number(this.zoom_level),
      scrollwheel:  false,
      styles: []
    };
    if(this.map_address == ''){
      mapOptions.center = {lat: -34.397, lng: 150.644};
    }
    var mapElement = this;
    var map = new google.maps.Map(mapElement, mapOptions);
    
    var geocoder = new google.maps.Geocoder();
    var marker = new google.maps.Marker({map});

    function clear() {
      marker.setMap(null);
    }
    function geocode(request) {
      clear();
      geocoder
      .geocode(request)
      .then((result) => {
        const { results } = result;
        map.setCenter(results[0].geometry.location);
        if(show_pin){
          marker.setPosition(results[0].geometry.location);
          marker.setMap(map);
        }
        return results;
      })
      .catch((e) => {
        console.log("Geocode was not successful for the following reason: " + e);
      });
    }
    
    geocode({ address: this.map_address });
  }
}
const event_map_loaded = new Event('mapLoaded');
customElements.define('map-section', mapSectionHandler);

class galleryCursor extends HTMLElement {
  constructor() {
    super();
    this.parentNode.addEventListener('mousemove', this.mousemove.bind(this));
  }
  mousemove(e){
    const containerRect = this.parentNode.getBoundingClientRect();
    let x = e.clientX - containerRect.left;
    let y = e.clientY - containerRect.top;
    const cursorHalfWidth = this.offsetWidth / 2;
    const cursorHalfHeight = this.offsetHeight / 2;
    x = Math.max(cursorHalfWidth, Math.min(x, containerRect.width - cursorHalfWidth));
    y = Math.max(cursorHalfHeight, Math.min(y, containerRect.height - cursorHalfHeight));
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }
}
customElements.define('gallery-cursor', galleryCursor);

class sectionCounter extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    var _this = this;
    import("@theme/module-countUp").then((module) => { module.initCountUp(_this) });
  }
}
customElements.define('section-counter', sectionCounter);

class ImageComparison extends HTMLElement {
  constructor() {
    super();
    var _this = this;
    import("@theme/image-comparison").then((module) => { module.startComparison(_this) });
  }
}
customElements.define("image-comparison", ImageComparison);

class LookbookBullet extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    var _this = this;
    import("@theme/module-change-svg-id").then((module) => { module.changeSvgId() });
    import("@theme/module-lookbook").then((module) => { module.startLookbook(_this) });
  }
}
customElements.define("lookbook-bullet", LookbookBullet);

class RandomCounter extends HTMLElement {
  constructor() {
    super();
    this.min = parseInt(this.getAttribute('data-min')) || 0;
    this.max = parseInt(this.getAttribute('data-max')) || 100;
    this.delay = parseInt(this.getAttribute('data-delay')) || 2;
    this.startCounter();
  }
  getRandomNumber() {
    return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
  }
  startCounter() {
    this.updateNumber();
    this.interval = setInterval(() => {
      this.updateNumber();
    }, this.delay * 1000);
  }
  updateNumber() {
    this.innerHTML = this.getRandomNumber().toString();
  }
  disconnectedCallback() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
customElements.define("random-counter", RandomCounter);

class freeDeliveryBar extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.threshold = this.getAttribute("data-price-max");
    this.threshold = Math.round(this.threshold * (Shopify.currency.rate || 1));
    this.style.setProperty('--max-length', this.threshold);
    var _threshold = Number(getComputedStyle(this).getPropertyValue('--length'));

    if(_threshold >= this.threshold){
      this.querySelector('.free-delivery-bar__toolbar__full').classList.remove('hide')
    }
    else{
      var pr1 = this.getAttribute("data-price-current").replace(',', '.');
      var pr2 = this.getAttribute("data-price-max-real");
      pr2 = Math.round(pr2 * (Shopify.currency.rate || 1));
      var dataSymbol = this.getAttribute("data-symbol");
      var val = Number(pr2 - pr1);
      val = val != Math.round(val) ? val.toFixed(2) : val;
      this.querySelector('.free-delivery-bar__toolbar__text__current .fshbar').innerHTML = dataSymbol.replace(0, val);
      this.querySelector('.free-delivery-bar__toolbar__text__current').classList.remove('hide');
    }
  }
}
if (document.readyState === 'complete') {
  customElements.define('free-delivery-bar', freeDeliveryBar);
}
else{
  window.addEventListener('load', () => {
    customElements.define('free-delivery-bar', freeDeliveryBar);
  });
}

class sectionSlider extends HTMLElement {
  constructor() {
    super();
    var _this = this;
    _this.addEventListener('mousemove', mousemoveHeaderNavHandler, false);
    function mousemoveHeaderNavHandler(){
      _this.removeEventListener('mousemove', mousemoveHeaderNavHandler, false);
      _this.querySelectorAll(`tag-image`).forEach((item) => {
        const img = item.querySelector('img');
        if(img.hasAttribute('data-main')){
          const size = item.getSize();
          if(!size) return;
          img.src = size;
          img.removeAttribute('loading')
        }
      });
    }
  }
}
customElements.define('section-slider', sectionSlider);

class tickerHandler extends HTMLElement {
  constructor() {
    super();
    this.width = 0;
    this.ticker = this.querySelector('.ticker__container--js');
    setTimeout(this.resizeHandler.bind(this), 100);

    this.debouncedResizeHandler = this.debounce(this.resizeHandler.bind(this), 150);
    window.addEventListener("resize", this.debouncedResizeHandler, false);

    this.querySelectorAll("[loading]").forEach((item) => {
      item.removeAttribute("loading");
    });
    this.initfunction = this.init.bind(this);
    window.addEventListener('tickerLoaded', this.initfunction);
    if(!document.querySelector('.tickerjs')){
      let script = document.createElement('script');
      script.classList.add('tickerjs')
      script.src = this.getAttribute('data-script');
      script.onload = () => {
        window.dispatchEvent(new CustomEvent('tickerLoaded'))
      };
      document.head.append(script);
    }
    Shopify.designMode&&this.init();
  }
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  disconnectedCallback() {
    window.removeEventListener("resize", this.debouncedResizeHandler);
    window.removeEventListener('tickerLoaded', this.initfunction);
  }
  init(){
      !Shopify.designMode&&window.removeEventListener('tickerLoaded', this.initfunction);
      var translate = 1.5 * 100 / (1 + 1.5);
      if (this.dataset.direction == 'right') {
        translate = translate * -1;
      }
      Motion.scroll(
        Motion.animate(this, { transform: [`translateX(${translate}%)`, `translateX(0)`] }, { easing: 'linear' }),
        { target: this, offset: ['start end', 'end start'] }
      );
  }
  resizeHandler(){
    if(this.width == window.innerWidth) return;
	  this.width = window.innerWidth;
    const container = this.closest(".ticker-section__container");
    const local_width = container.offsetWidth;
    const tickerWidth = this.ticker.offsetWidth;

    this.ticker.classList.remove('ticker--animation');
    var boxes = this.querySelectorAll('.ticker--clone');
    if(boxes.length){
      boxes.forEach(e => e.remove());
    }

    var length = local_width / tickerWidth;
    length = length == Infinity ? 5 : Math.ceil(length) + 1;
    const fragment = document.createDocumentFragment();
    for(var i=0; i < length; i++){
      let clone = this.ticker.cloneNode(true);
      clone.classList.add('ticker--clone');
      clone.classList.add('ticker--animation');
      fragment.prepend(clone);
    }
    this.prepend(fragment);
    this.ticker.classList.add('ticker--animation');
  }
}
customElements.define('component-ticker', tickerHandler);

class wokieeSwiperReels extends HTMLElement {
  constructor() {
    super();
    this.swiper = false;
    this.classList.add('swiper-buttons-initialized');
    this.startHandler = this.start.bind(this);
    window.addEventListener('swiperLoaded', this.startHandler);
    typeof Swiper === "function"&&this.start();
    if(!document.querySelector('.swiperjs')){
      let script = document.createElement('script');
      script.classList.add('swiperjs')
      script.src = this.getAttribute('data-script');
      script.onload = () => {
        window.dispatchEvent(new CustomEvent('swiperLoaded'))
      };
      document.head.append(script);
    }
    else{
      Shopify.designMode&&setTimeout(this.start.bind(this), 100);
    }
  }
  start(){
    this.gutter = this.getAttribute('data-gutter');
    this.gutter_mobile = this.getAttribute('data-gutter-mobile');
    this.xl = Number(this.getAttribute('data-grid').split(',')[0]);
    this.sm = Number(this.getAttribute('data-grid').split(',')[1]);
    this.md = Number(this.getAttribute('data-grid').split(',')[2]);
    this.lg = Number(this.getAttribute('data-grid').split(',')[3]);
    this.xxl = Number(this.getAttribute('data-grid').split(',')[4]);

    if(this.classList.contains('swiper-nested')){
      setTimeout(this.init.bind(this), 300)
    }
    else{
      this.init();
    }
  }
  goToNextSlide(){
  }
  selectSlide(index, delay){
    delay = delay || 0;
    this.swiper.slideTo(index, delay);
  }
  resizeHandler(){
    setTimeout(this.initPaginationCss.bind(this), 100)
  }
  initPaginationCss(){
    if(!this.querySelector('.swiper-pagination')) return;
    var length = this.querySelector('.swiper-pagination').children.length;
    this.style.setProperty('--pagination-count', length);

    var bullets = this.querySelectorAll('.swiper-pagination-bullet');
    if(bullets.length > 28 && window.innerWidth <= 576){
      this.style.setProperty('--swiper-pagination-bullet-size', '4px');
      this.style.setProperty('--swiper-pagination-bullet-width', '4px');
      this.style.setProperty('--swiper-pagination-bullet-height', '4px');
      this.style.setProperty('--swiper-pagination-bullet-horizontal-gap', '2px');
      this.style.setProperty('--pagination-item-width', '8px');
    }
    else if(window.innerWidth > 576){
      this.style.setProperty('--swiper-pagination-bullet-size', '8px');
      this.style.setProperty('--swiper-pagination-bullet-width', '8px');
      this.style.setProperty('--swiper-pagination-bullet-height', '8px');
      this.style.setProperty('--swiper-pagination-bullet-horizontal-gap', '4px');
      this.style.setProperty('--pagination-item-width', '16px');
    }
  }
  init(){
    this.configureSwiper();
    this.swiper.on('afterInit', this.afterInit.bind(this));
    this.swiper.on('slidesLengthChange', this.slideUpdate.bind(this));
    this.swiper.init();
    this.initSwiper();
  }
  initSwiper(){
    typeof Swiper === "function"&&this.swiper.init();
  }
  configureSwiper(){
    try {
      var effect = this.hasAttribute('data-effect') ? this.getAttribute('data-effect') : 'slide',
          autoheight = this.hasAttribute('data-autoheight') ? true : false,
          allowtouchmove = this.hasAttribute('data-allowtouchmove') ? false : true,
          nested = this.classList.contains('swiper-nested'),
          loop = this.classList.contains('swiper-loop')?true:nested,
          speed = this.hasAttribute('data-speed') ? this.getAttribute('data-speed') : 300;
      this.swiper = new Swiper(this, {
        init: false,
        slidesPerView: this.xl,
        rewind: true,
        effect: effect,
        autoHeight: autoheight,
        allowTouchMove: allowtouchmove,
        simulateTouch:true,
        slidesPerGroupAuto:this.xl,
        slidesPerGroup:this.xl,
        spaceBetween: this.gutter_mobile,
        nested:nested,
        loop:loop,
        speed:speed,
        slideFullyVisibleClass: 'swiper-slide-fullyvisible',
        watchSlidesProgress: true,
        breakpoints: {
          577: {
            slidesPerView: this.sm,
            slidesPerGroupAuto:this.sm,
            slidesPerGroup:this.sm,
            spaceBetween: this.gutter
          },
          1025: {
            slidesPerView: this.md,
            slidesPerGroupAuto:this.md,
            slidesPerGroup:this.md,
            spaceBetween: this.gutter
          },
          1361: {
            slidesPerView: this.lg,
            slidesPerGroupAuto:this.lg,
            slidesPerGroup:this.lg,
            spaceBetween: this.gutter
          },
          1441: {
            slidesPerView: this.xxl,
            slidesPerGroupAuto:this.xxl,
            slidesPerGroup:this.xxl,
            spaceBetween: this.gutter
          }
        },
        pagination: {
          el: this.nextElementSibling&&this.nextElementSibling.querySelector('.swiper-pagination')||this.querySelector('.swiper-pagination'),
          clickable: true
        },
        navigation: {
          nextEl: this.nextElementSibling&&this.nextElementSibling.querySelector('[class*="-swiper-button-next"')||this.querySelector('.internal-swiper-button-next')||this.querySelector('.internal-swiper-custom-button-next'),
          prevEl: this.nextElementSibling&&this.nextElementSibling.querySelector('[class*="-swiper-button-prev"')||this.querySelector('.internal-swiper-button-prev')||this.querySelector('.internal-swiper-custom-button-prev')
        }
      });
      this.swiper.on('slideChange', this.slideChange.bind(this));      
    } 
    catch(err) {

    }
  }
  afterInit(){
    var _this = this;
    setTimeout(function(){
      _this.classList.add('swiper-initialized-custom');
    }, 100)
    
    this.dispatchEvent(new CustomEvent('slide_inited'));
    if(this.querySelector('.swiper-pagination')){
      window.addEventListener('resize', this.resizeHandler.bind(this));
      this.initPaginationCss();
    }
  }
  destroy(){
    this.swiper&&this.swiper.destroy();
  }
  slideChange(e){
    this.querySelectorAll('video-js:not([data-autoplay="true"])').forEach(item => {
      var index = Number(Array.prototype.indexOf.call(item.closest('.swiper-wrapper').children, item.closest('.swiper-slide')));
      e.activeIndex != index&&item.dispatchEvent(new CustomEvent('stopVideo'));
    });
  }
  slideUpdate(){
    setTimeout(this.initPaginationCss.bind(this), 100)
  }
  getActiveSlide(){
    return this.swiper.activeIndex;
  }
}
customElements.define('swiper-reels', wokieeSwiperReels);

class SectionAccordion extends HTMLElement {
  constructor() {
    super();
    if(!this.classList.contains('align-items-center')) return;
    this.classList.remove('align-items-center');
    window.addEventListener('resize', this.resizeHandler.bind(this));
    this.resizeHandler();
  }
  resizeHandler(){
    var acc_image = this.querySelector('.accordion__container__image');
    var acc_content = this.querySelector('.accordion__container_content');
    if(window.innerWidth <= 576){
      acc_content.style.setProperty("padding-top", 0);
      acc_image.style.setProperty("padding-top", 0);
      return;
    }
    var acc_image_h = 0;
    var acc_content_h = 0;
    Array.from(acc_image.children).forEach((item) => {
      acc_image_h += item.offsetHeight;
    });
    if(this.querySelector('toggle-component')){
      const style = window.getComputedStyle(this.querySelector('toggle-component'));
      const marginTop = parseFloat(style.getPropertyValue('margin-top'));
      acc_content_h += marginTop;
    }
    Array.from(acc_content.children).forEach((item) => {
      if(item.querySelectorAll('.chm-toggle summary').length){
        item.querySelectorAll('.chm-toggle summary').forEach((item) => {
          acc_content_h += item.offsetHeight;
        });
      }
      else{
        acc_content_h += item.offsetHeight;
      }
    });

    if(acc_image_h > acc_content_h){
      acc_content.style.setProperty("padding-top", Math.round((acc_image_h-acc_content_h)/2)+'px');
      acc_image.style.setProperty("padding-top", 0);
    }
    else{
      acc_content.style.setProperty("padding-top", 0);
      acc_image.style.setProperty("padding-top", Math.round((acc_content_h-acc_image_h)/2)+'px');
    }
  }
}
customElements.define('section-accordion', SectionAccordion);

class PromoHeader extends HTMLElement {
  constructor() {
    super();
    this.time_next = this.getAttribute('data-next-start');//minutes
    this.space_name = "promo-header";
  }
  connectedCallback() {
    if(this.getCookie(this.space_name) && !Shopify.designMode && this.time_next > 0){
      return false;
    }
    this.parentNode.classList.add('show');
    this.querySelector('.popup-modal__toggle').addEventListener('click', this.closeHandler.bind(this));
  }
  closeHandler(e){
    e.preventDefault();
    this.parentNode.classList.remove('show');
    if(!Shopify.designMode && this.time_next > 0){
      this.setCookie(this.space_name,"close",this.time_next);
    }
  }
  setCookie(name,value,minutes) {
    var expires = "";
    if (minutes) {
      var date = new Date();
      date.setTime(date.getTime() + (minutes*60*1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }
  getCookie(name){
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
    return false;
  }
  disconnectedCallback() {
  }
}
customElements.define('promo-header', PromoHeader);

class SectionBackground extends HTMLElement {
  constructor() {
    super();
    this.resize = this.resizeHandler.bind(this);
    this.observerCallback = this.observerCallback.bind(this);

    this.top=           this.getAttribute("data-top")/100;
    this.bottom=        this.getAttribute("data-bottom")/-100;
    this.top_tablet=    this.getAttribute("data-top-tablet")/100;
    this.bottom_tablet= this.getAttribute("data-bottom-tablet")/-100;
    this.top_mobile=    this.getAttribute("data-top-mobile")/100;
    this.bottom_mobile= this.getAttribute("data-bottom-mobile")/-100;
    
    this.observers = [];
    this.currentElement = null;
    this.previousElement = null;
    this.nextElement = null;
  }

  connectedCallback() {
    window.addEventListener('resize', this.resize);
    this.setupObservers();
    this.resizeHandler();
  }
  disconnectedCallback() {
    window.removeEventListener('resize', this.resize);
    this.disconnectObservers();
  }

  setupObservers() {
    this.currentElement = this.closest('section');
    if (!this.currentElement) return;
    this.observeElement(this.currentElement);
    this.previousElement = this.currentElement.previousElementSibling;
    if (this.previousElement) {
      this.observeElement(this.previousElement);
    }
    this.nextElement = this.currentElement.nextElementSibling;
    if (this.nextElement) {
      this.observeElement(this.nextElement);
    }
  }
  observeElement(element) {
    const observer = new ResizeObserver(this.observerCallback);
    observer.observe(element);
    this.observers.push({ element, observer });
  }
  observerCallback(entries) {
    this.resizeHandler();
  }
  disconnectObservers() {
    this.observers.forEach(({ observer }) => observer.disconnect());
    this.observers = [];
  }
  resizeHandler() {
    if (!this.currentElement) {
      this.currentElement = this.closest('section');
      if (!this.currentElement) return;
    }
    const newPreviousElement = this.currentElement.previousElementSibling;
    const newNextElement = this.currentElement.nextElementSibling;

    if (newPreviousElement !== this.previousElement) {
      this.disconnectObservers();
      this.setupObservers();
    } else if (newNextElement !== this.nextElement) {
      this.disconnectObservers();
      this.setupObservers();
    }

    let prev_h = 0;
    let next_h = 0;

    if (this.previousElement) {
      prev_h = this.previousElement.clientHeight;
    }
    if (this.nextElement) {
      const distance = this.nextElement.getBoundingClientRect().top - 
                      this.currentElement.getBoundingClientRect().bottom;
      next_h = this.nextElement.clientHeight + Math.max(0, distance);
    }

    let topCoefficient, bottomCoefficient;
    if (window.innerWidth >= 1025) {
      topCoefficient = this.top;
      bottomCoefficient = this.bottom;
    } else if (window.innerWidth >= 577) {
      topCoefficient = this.top_tablet;
      bottomCoefficient = this.bottom_tablet;
    } else {
      topCoefficient = this.top_mobile;
      bottomCoefficient = this.bottom_mobile;
    }
    this.style.top = `${Math.floor(prev_h * topCoefficient)}px`;
    this.style.bottom = `${Math.floor(next_h * bottomCoefficient)}px`;
  }
}
customElements.define('section-background', SectionBackground);

class animatedBadge extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    var _this = this;
    import("@theme/module-animated-badge").then((module) => { module.startBadge(_this) });
  }
}
customElements.define("animated-badge", animatedBadge);

class FooterstickyNav extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    var _this = this;
    import("@theme/module-footersticky-nav").then((module) => { module.startNav(_this) });
  }
}
customElements.define("footersticky-nav", FooterstickyNav);

class quickViewHandler{
  constructor() {
    this.modal = document.querySelector("#PopupModal-quickview");
    this.modal_content = this.modal.querySelector(".popup-modal__content__content");
    this.opener = this.modal.querySelector(".themeloader_container");
    this.handler = this.handler.bind(this);
    window.addEventListener('openQuickView', this.handler);
    this.eventclick = this.eventclick.bind(this);
  }
  handler(e){
    this.dataproducturl = e.detail.href;
    this.opener.classList.add('loading_now');
    this.modal_content.classList.add('opacity0');
    this.destroyEvents();
    this.modal_content.innerHTML = "";
    fetch(this.dataproducturl)
    .then((response) => response.text())
    .then((responseText) => {
      const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
      this.productElement = responseHTML.querySelector('section[id^="MainProduct-"]');
      this.modal_content.setAttribute('data-section', this.productElement.dataset.section);
      this.removeDOMElements();
      this.setInnerHTML(this.modal_content, this.productElement.innerHTML);
      this.modal_content.classList.remove('opacity0');

      if (window.Shopify && Shopify.PaymentButton) {
        Shopify.PaymentButton.init();
      }
      if (window.ProductModel) window.ProductModel.loadShopifyXR();

      this.createEvents();
    })
    .finally(() => {
      this.opener.classList.remove('loading_now');
    });
  }
  createEvents(){
    this.modal_content.querySelectorAll('.product__title').forEach((item) => {
      item.addEventListener('click', this.eventclick);
    });
  }
  destroyEvents(){
    this.modal_content.querySelectorAll('.product__title').forEach((item) => {
      item.removeEventListener('click', this.eventclick);
    });
  }
  eventclick(e){
    window.location.href = this.dataproducturl;
  }
  setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach(oldScriptTag => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach(attribute => {
        newScriptTag.setAttribute(attribute.name, attribute.value)
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
  removeDOMElements() {
    const pickupAvailability = this.productElement.querySelector('pickup-availability');
    if (pickupAvailability) pickupAvailability.remove();

    this.removeElements('.product__buttons__container');
    this.removeElements('modal-dialog');
    this.removeElements('modal-opener');
    this.removeElements('.horizontal_tabs__block');
    this.removeElements('.product-tab-secondary');
    this.removeElements('select-option-js');
    this.removeElements('sticky-cart-modal');
    this.removeElements('complementary-products');
    this.removeElements('lightbox-opener');
    this.removeElements('theme-lightbox');
    this.removeElements('zoom-icon');
    this.removeElements('.product--thumbnail_slider');
    this.removeElements('.option-empty');

    var vs = this.productElement.querySelector('variant-selects');
    vs&&vs.setAttribute('data-update-url', false);
    
    var element = false;

    element = this.productElement.querySelector('.product__media-sticky');
    element && element.classList.remove('product__media-sticky');
  }

  removeElements(value){
    var elements = this.productElement.querySelectorAll(value);
    elements.forEach((element) => {
      element.remove();
    });
  }
}
var quickview = new quickViewHandler();

class ProductcardList extends HTMLElement {
  constructor() {
    super();
    var item = this.querySelector('[id*="price-card-"]');
    if(item){
      window.addEventListener('resize', this.createProductView.bind(this));
      this.createProductView();
    }
  }
  createProductView(e){
    if(window.innerWidth >= 577){
      this.createListView();
    }
    else{
      this.createNormalView();
    }
  }
  createListView(){
    var item = this.querySelector('[id*="price-card-"]');
    var _product_card = item.closest('.product-card');
    var _elem = _product_card.querySelector('.product-card__interface');
    _elem&&_elem.insertBefore(item, _elem.firstChild);
  }
  createNormalView(){
    var item = this.querySelector('[id*="price-card-"]');
    var _product_card = item.closest('.product-card');
    var _elem = _product_card.querySelector('.product-card__heading');
    _elem&&_elem.after(item);
  }

}
customElements.define("productcard-list", ProductcardList);

class CurrentSalesPopup extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    var _this = this;
    import("@theme/module-current-sales-popup").then((module) => { module.init(_this) });
  }
}
customElements.define("current-sales-popup", CurrentSalesPopup);