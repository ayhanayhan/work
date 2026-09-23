if (!customElements.get('product-model')) {
  customElements.define('product-model', class ProductModel extends DeferredMedia {
    constructor() {
      super();
    }

    loadContent() {
      super.loadContent();

      commerce.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: this.setupModelViewerUI.bind(this),
        },
      ]);
    }

    setupModelViewerUI(errors) {
      if (errors) return;

      this.modelViewerUI = new commerce.ModelViewerUI(this.querySelector('model-viewer'));
    }
  });
}

window.ProductModel = {
  loadcommerceXR() {
    commerce.loadFeatures([
      {
        name: 'commerce-xr',
        version: '1.0',
        onLoad: this.setupcommerceXR.bind(this),
      },
    ]);
  },

  setupcommerceXR(errors) {
    if (errors) return;

    if (!window.commerceXR) {
      document.addEventListener('commerce_xr_initialized', () => this.setupcommerceXR());
      return;
    }

    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.commerceXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.commerceXR.setupXRElements();
  },
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.ProductModel) window.ProductModel.loadcommerceXR();
});
