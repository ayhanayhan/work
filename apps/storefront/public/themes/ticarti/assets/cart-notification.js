class CartNotification extends HTMLElement {
  constructor() {
    super();
    this.notification = this;
    this.cart_icon = document.querySelector('#cart-icon-bubble-short')?'cart-icon-bubble-short':'cart-icon-bubble';
    this.cart_icon_mobile = document.querySelector('#cart-icon-bubble--mobile-short')?'cart-icon-bubble--mobile-short':'cart-icon-bubble--mobile';
    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('animate');
    setTimeout(() => {
      this.notification.classList.remove('active');
      document.body.classList.remove('overflow-hidden');
      document.body.style.paddingRight = '';
    }, 500);
    removeTrapFocus(this.activeElement);
    this.querySelector('.dcomp__desk')&&this.querySelector('.dcomp__desk').classList.remove('animate');
  }

  renderContents(parsedState) {
    this.cartItemKey = parsedState.key;
    this.getSectionsToRender().forEach((section) => {
      if(section.id == 'cart-free-delivery' && document.querySelector('#product-page-free-delivery')){
        document.querySelector('#product-page-free-delivery').innerHTML =
        this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
      }
      if(section.id == this.cart_icon && document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble')){
        const parser = new DOMParser();
        const bubble = parser.parseFromString(this.getSectionInnerHTML(parsedState.sections[section.id], section.selector), 'text/html');
        var ib = bubble.querySelector('.cart-count-bubble')?bubble.querySelector('.cart-count-bubble').innerHTML : '' ;
        document.querySelector('.footer-sticky-nav__item__icon .cart-count-bubble').innerHTML = ib;
      }
      if(document.getElementById(section.id)){
        if(section.id == "cart-notification"){
          document.getElementById(`cart-notification-product`).innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id],section.selector);
          const html_obj = this.getSectionHTMLObject(parsedState.sections[section.id]);
          if(html_obj.querySelector('[data-product-id-js]')){
            const dp = html_obj.querySelector(`[data-product-id-js="${this.cartItemKey}"]`).cloneNode(true);
            dp.querySelector('complementary-products').classList.remove('ignore-js');
            document.querySelector(`.drawer__footer-content__left__content`).innerHTML = '';
            document.querySelector(`.drawer__footer-content__left__content`).append(dp);
          }
        }
        else{
          document.getElementById(section.id).innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id],section.selector);
        }
      }
    });

    this.open();
  }
  updateRecommendations(){
    if(this.querySelector('complementary-products').children.length == 0 ){
      this.querySelector('.dcomp__desk').classList.remove('animate');
    }
    else{
      this.querySelector('.dcomp__desk').classList.add('animate');
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification',
        selector: `[id="cart-notification-product-${this.cartItemKey}"]`
      },
      {
        id: 'cart-notification-button',
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

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
  getSectionHTMLObject(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);