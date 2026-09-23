if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        this.form = this.querySelector('form');
        this.form && this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            this.cart.renderContents(response);
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading-overlay__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}

class stickyCartModal extends HTMLElement {
  constructor() {
    super();
    window.addEventListener('scroll', this.update.bind(this));
    this.update();
    this.querySelector('.sticky-cart-button').addEventListener('click', this.onClickHandler.bind(this));
    this.querySelector('.sticky-cart-button').addEventListener('keydown', this.onClickKeydownHandler.bind(this));
  }
  update(){
    const sectionId = this.dataset.section;
    const buttonContainer = document.getElementById(`product-form-${sectionId}`);
    const sect = this.closest('.shopify-section, .popup-modal__content__data');
    const hasSelectOption = sect?.querySelector('select-option-js');
    const customAddButton = buttonContainer?.querySelector('.select-options-button');
    const addButton = (hasSelectOption && customAddButton) ? customAddButton : buttonContainer?.querySelector('[name="add"]');
    const rangeToShowModal = this.getTop(addButton) + addButton.clientHeight;

    if(rangeToShowModal <= 0) return false;
    if(window.scrollY >= rangeToShowModal && !this.classList.contains('show-modal')){
      this.classList.add('show-modal');
      document.querySelector('body').classList.add('modal__sticky-cart');
      document.querySelector('.footer__content').classList.add('sticky-cart-modal_bottom_padding');
    }
    if(window.scrollY < rangeToShowModal && this.classList.contains('show-modal')){
      this.classList.remove('show-modal');
      document.querySelector('body').classList.remove('modal__sticky-cart');
    }
  }
  onClickKeydownHandler(event){
    if(event.code.toUpperCase() !== 'ENTER') return false;
    this.onClickHandler();
  }
  onClickHandler(){
    var item = document.querySelector(`.product__column__content [id*="variant-selects-"]`),
        btn_item = document.getElementById("product-container"),
        _y = (item ? this.getTop(item) : this.getTop(btn_item)) - 20;
    this.scrollTo(_y,700);
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
}
customElements.define('sticky-cart-modal', stickyCartModal);
