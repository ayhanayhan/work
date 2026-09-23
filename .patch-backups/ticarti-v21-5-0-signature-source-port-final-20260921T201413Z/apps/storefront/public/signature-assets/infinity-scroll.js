class infinityButton extends HTMLElement {
  constructor() {
    super();
    this.link = this.querySelector('.btn');
    this.link&&this.link.addEventListener('click', this.handler.bind(this));
    this.classList.contains('autoscroll_yes') && window.addEventListener('scroll', this.autoscrollhandler.bind(this));
  }
  handler(event){
    event.preventDefault();
    if(this.destroyed) return false;
    placeCollectionLoader();
    document.querySelector('.collection_facets_loader').classList.add('loading_now');
    var url = event.currentTarget.href;
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        var container = false,
            _html = false;
        
        container = document.querySelector('.collection__container').lastElementChild;
        _html = new DOMParser().parseFromString(html, 'text/html').querySelector('.collection__container').innerHTML;
        container.insertAdjacentHTML("afterend", _html);

        container = document.querySelector('infinity-button');
        _html = new DOMParser().parseFromString(html, 'text/html').querySelector('infinity-button');
        container.replaceWith(_html);

        document.querySelector('.collection_facets_loader').classList.remove('loading_now');
    });
  }
  autoscrollhandler(){
    if(!this.link || this.destroyed) return false;
    if(!this.link.classList.contains('autoscroll')) return false;
    var contY = parseInt(this.link.parentNode.offsetTop);
    var wY = this.getWindowHeight()+this.getWindowTopY();
    if( contY <= wY ) {
      this.link.classList.remove('autoscroll');
      this.link.dispatchEvent(new Event('click', {bubbles: true, cancelable: true}));
    }
  }
  getWindowHeight(){
    return window.innerHeight;
  }
  getWindowTopY(){
    return window.pageYOffset || document.documentElement.scrollTop;
  }
  disconnectedCallback(){
    this.destroyed = true;
    this.remove();
  }
}
customElements.define('infinity-button', infinityButton);