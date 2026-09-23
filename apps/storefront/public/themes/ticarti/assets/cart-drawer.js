class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.cart_icon = document.querySelector('#cart-icon-bubble-short')?'cart-icon-bubble-short':'cart-icon-bubble';
    this.cart_icon_mobile = document.querySelector('#cart-icon-bubble--mobile-short')?'cart-icon-bubble--mobile-short':'cart-icon-bubble--mobile';
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.setHeaderCartIconAccessibility();
    this.updRecom = true;
    this.opened = false;
  }
  setUpdRecom(){
    this.updRecom = true;
  }
  setHeaderCartIconAccessibility() {
    document.querySelectorAll(`[id*="cart-icon-bubble"]`).forEach((cartLink) => {
      cartLink.setAttribute('role', 'button');
      cartLink.setAttribute('aria-haspopup', 'dialog');
      cartLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.open(cartLink);
      });
      cartLink.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'SPACE') {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    })
  }

  open(triggeredBy) {
    this.opened = true;
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    setTimeout(() => {
      this.classList.add('active');
      this.classList.add('animate');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    if(document.querySelectorAll('.popup-modal.active').length == 0){
      document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
      document.body.classList.add('overflow-hidden');
    }

    this.openComplementary(1500);
  }
  openComplementary(delay){
    delay = delay || 500;
    const desk = this.querySelector('.dcomp__desk-js');
    const currentWidth = window.innerWidth;
    if (!desk || currentWidth <= 576) {
        return false;
    }
    this.animateTimeout&&clearTimeout(this.animateTimeout);
    this.animateTimeout = setTimeout(() => {
      const compProducts = desk.querySelector('complementary-products');
      if (compProducts && compProducts.children.length > 0) {
        desk.classList.add('animate');
      }
      this.animateTimeout = null;
    }, delay);
  }
  clearAdditionalProducts(){
    const deskJs = this.querySelector('.dcomp__desk-js');
    const container = deskJs?.querySelector('.drawer__footer-content__left__content');
    if (container) {
      deskJs.classList.remove('animate');
      setTimeout(() => {container.replaceChildren();}, 500);
    }
  }
  updateRecommendations(complementaryProducts){
    const desk = this.querySelector('.dcomp__desk-js');
    const currentWidth = window.innerWidth;
    if (!desk) {
      return false;
    }
    if (currentWidth <= 576) {
      complementaryProducts.closest('.dcomp__mobile').classList.remove('hide');
      return false;
    }
    const productId = complementaryProducts.getAttribute('data-product-id');
    const container = this.querySelector(`.dcomp__desk .drawer__footer-content__left__content`);
    if(this.updRecom == true){
      container.innerHTML = "";
      this.updRecom = false;
    }
    if (container) {
      if (complementaryProducts.children.length > 0) {
        const oldparent = complementaryProducts.closest('.drawer__footer-content__left');
        const parentIndex = Array.from(oldparent.parentNode.children).indexOf(oldparent);
        const duplicate = complementaryProducts.closest('.drawer__footer-content__left__content').cloneNode(true);
        duplicate.querySelector('complementary-products').classList.add('ignore-js');
        const wrapper = document.createElement('div');
        wrapper.className = 'drawer__footer-content__left__item';
        wrapper.setAttribute('data-dcomp', `dcomp-${productId}`); 
        wrapper.setAttribute('data-index', `${parentIndex}`);
        wrapper.append(...duplicate.children);
        const existingItems = Array.from(container.children);
        const referenceNode = existingItems.find(item => {
          return parseInt(item.getAttribute('data-index')) > parentIndex;
        });
        if (referenceNode) {
          container.insertBefore(wrapper, referenceNode);
        } else {
          container.append(wrapper);
        }
        this.opened && this.openComplementary();
      }
    }
  }
  close() {
    this.classList.remove('animate');
    setTimeout(() => {
      this.classList.remove('active');
      if(document.querySelectorAll('.popup-modal.active').length == 0){
        document.body.classList.remove('overflow-hidden');
        document.body.style.paddingRight = '';
      }
    }, 500);
    removeTrapFocus(this.activeElement);
    this.querySelector('.dcomp__desk-js')&&this.querySelector('.dcomp__desk-js').classList.remove('animate');
    this.opened = false;
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') && this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    const currentWidth = window.innerWidth;
    this.updRecom = true;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);
      if(sectionElement){
        if(sectionElement.querySelector('.dcomp__desk.animate') && currentWidth > 576){
          const cur_obj = sectionElement.querySelector('drawer-inner');
          const new_obj = new DOMParser().parseFromString(parsedState.sections[section.id], 'text/html').querySelector('drawer-inner');
          cur_obj.replaceWith(new_obj);
        }
        else{
          sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
        }
      }
      if(section.id == 'cart-free-delivery' && document.querySelector('#product-page-free-delivery')){
        document.querySelector('#product-page-free-delivery').innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
      }
      if(section.id == this.cart_icon && document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble')){
        const parser = new DOMParser();
        const bubble = parser.parseFromString(this.getSectionInnerHTML(parsedState.sections[section.id], section.selector), 'text/html');
        var ib = bubble.querySelector('.cart-count-bubble')?bubble.querySelector('.cart-count-bubble').innerHTML : '' ;
        document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble').innerHTML = ib;
      }
    });

    setTimeout(() => {
      this.open();
    });
  }
  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: this.cart_icon,
      },
      {
        id: this.cart_icon_mobile
      },
      {
        id: 'cart-free-delivery'
      }
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
  getScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }
}
customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    this.cart_icon = document.querySelector('#cart-icon-bubble-short')?'cart-icon-bubble-short':'cart-icon-bubble';
    this.cart_icon_mobile = document.querySelector('#cart-icon-bubble--mobile-short')?'cart-icon-bubble--mobile-short':'cart-icon-bubble--mobile';
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: this.cart_icon,
        section: this.cart_icon,
        selector: '.shopify-section',
      },
      {
        id: this.cart_icon_mobile,
        section: this.cart_icon_mobile,
        selector: '.shopify-section'
      }
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);