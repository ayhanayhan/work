class collectionGrid extends HTMLElement {
  constructor() {
    super();
    Shopify.designMode && localStorage.getItem("collection-grid") !== null && localStorage.removeItem("collection-grid");
    this.querySelectorAll('.collection-grid__item').forEach((item) => {
      item.addEventListener('click', (event) => {
        var item = event.target;            
        if(window.innerWidth >= 1025){
          this.selectCurrentGrid(item, 'data-grid', 'data-d', 'active-d');
        }
        else if(window.innerWidth >= 577){
          this.selectCurrentGrid(item, 'data-grid-t', 'data-t', 'active-t');
        }
        else{
          this.selectCurrentGrid(item, 'data-grid-m', 'data-m', 'active-m');
        }
        this.setLocalStorage();
      });
    });
    this.setDefaults();
    window.addEventListener('updateGrid', this.setDefaults.bind(this));
  }
  selectCurrentGrid(item, val1, val2, val3){
    var grid = false,
        grid_c = false,
        collection__container = document.querySelector('.collection__container');
    grid = item.getAttribute(val1);
    grid_c = collection__container.getAttribute(val2);
    collection__container.setAttribute(val2, grid);
    collection__container.classList.remove(grid_c);
    collection__container.classList.add(grid);
    this.querySelector('.'+val3).classList.remove(val3);
    item.classList.add(val3);
    this.sendEventList(grid);
    window.dispatchEvent(new CustomEvent('reresizeimage'));
  }
  setDefaults(){
    var saved = JSON.parse(this.readLocalStorage());
    this.setHtmlValue('data-d', saved['data-d'], 'active-d', 'data-grid');
    this.setHtmlValue('data-t', saved['data-t'], 'active-t', 'data-grid-t');
    this.setHtmlValue('data-m', saved['data-m'], 'active-m', 'data-grid-m');
    this.sendEventList();
  }
  setHtmlValue(name, val, active_class, btn_tag){
    var collection__container = document.querySelector('.collection__container');
    if(!collection__container) return;
    var grid_c = collection__container.getAttribute(name);
    collection__container.classList.remove(grid_c);
    collection__container.classList.add(val);
    collection__container.setAttribute(name, val);
    this.querySelector('.'+active_class).classList.remove(active_class);
    this.querySelector(`.collection-grid__item[${btn_tag}=${val}]`).classList.add(active_class);
  }
  sendEventList(){
    window.dispatchEvent(new Event('createProductView'));
  }
  readLocalStorage(){
    if(localStorage.getItem("collection-grid") == null ){
      this.setLocalStorage();
    }
    return localStorage.getItem("collection-grid");
  }
  setLocalStorage(){
    return localStorage.setItem("collection-grid", JSON.stringify(this.createLocalStorageData()));
  }
  createLocalStorageData(){
    var collection__container = document.querySelector('.collection__container'),
        grid = false,
        obj = {};
    if(collection__container){
      obj['data-d'] = collection__container.getAttribute('data-d');
      obj['data-t'] = collection__container.getAttribute('data-t');
      obj['data-m'] = collection__container.getAttribute('data-m');
    }
    return obj;
  }
}
customElements.define('collection-grid', collectionGrid);

function placeCollectionLoader(){
  var facet_filters_form = document.querySelector('.facet-filters-form'),
      product_grid__container = document.querySelector('.product-grid__container');

  var x = facet_filters_form ? Math.round(facet_filters_form.offsetLeft) : 0;
  var x2 = facet_filters_form ? Math.round(product_grid__container.offsetLeft) : 0;
  
  document.querySelector('.collection_facets_loader').style.setProperty('--left', x2 + 'px');
  document.querySelector('.collection_facets_loader').style.setProperty('--right', x + 'px');
}
