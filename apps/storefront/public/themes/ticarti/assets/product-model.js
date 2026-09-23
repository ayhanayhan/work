if (!customElements.get('product-model')) {
  customElements.define('product-model', class ProductModel extends DeferredMedia {
    constructor() {
      super();
    }

    loadContent() {
      super.loadContent();

      Ticarti.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: this.setupModelViewerUI.bind(this),
        },
      ]);
    }

    setupModelViewerUI(errors) {
      if (errors) return;

      this.modelViewerUI = new Ticarti.ModelViewerUI(this.querySelector('model-viewer'));
    }
  });
}

window.ProductModel = {
  loadTicartiXR() {
    Ticarti.loadFeatures([
      {
        name: 'Ticarti-xr',
        version: '1.0',
        onLoad: this.setupTicartiXR.bind(this),
      },
    ]);
  },

  setupTicartiXR(errors) {
    if (errors) return;

    if (!window.TicartiXR) {
      document.addEventListener('Ticarti_xr_initialized', () => this.setupTicartiXR());
      return;
    }

    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.TicartiXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.TicartiXR.setupXRElements();
  },
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.ProductModel) window.ProductModel.loadTicartiXR();
});
