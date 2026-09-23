class comparePage extends HTMLElement {
  constructor() {
    super();
    this.empty = this.querySelector('.compare-is-empty');
    this.main = this.querySelector('.compare-content');
    this.settings = this.getAttribute('data-settings');
    this.init();
    window.addEventListener('compareUpdated', this.init.bind(this));
  }
  init(e){
    let isbutton_remove = e&&e.detail.target.className.indexOf('delete-item-button')>-1;
    const existingData = localStorage.getItem('productDataCompare');
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
    const existingData = localStorage.getItem('productDataCompare');
    if (!existingData) return false;

    var handles = '';
    const dataMap = JSON.parse(existingData);
    for (let key in dataMap) {
      if (dataMap.hasOwnProperty(key)) {
        handles += `${dataMap[key]}___${key}||`;
      }
    }
    this.load(handles);
  }
  load(handle){
    var _this = this;
    fetch(`${window.routes.all_products_collection_url}?view=compare_ajax&sort_by=${handle+this.settings}`)
      .then((response) => response.text())
      .then((responseText) => {
        _this.querySelector('.compare-ajax-content').innerHTML = responseText;
      });
  }
}
customElements.define('compare-page', comparePage);

class sliderSlide extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelectorAll('.wokiee-compare__container');
    this.grid_gap = Number(window.getComputedStyle(this).getPropertyValue('--compare-grid-gap').trim().replace('px',''));
    this.currentIndex = 0;
    this.querySelector('.next-btn').addEventListener('click', this.nextBtn.bind(this));
    this.querySelector('.prev-btn').addEventListener('click', this.prevBtn.bind(this));
    this.resizeHandler();
    window.addEventListener('resize', this.resizeHandler.bind(this));
    window.addEventListener('compareItemDeleted', this.resizeHandler.bind(this));
  }
  nextBtn(){
    if (this.currentIndex < this.slider[0].children.length - 1) {
      this.currentIndex++;
      var slideWidth = this.slider[0].lastChild.offsetWidth;
      var drag = this.currentIndex * slideWidth + this.currentIndex * this.grid_gap;
      var fullwidth = this.slider[0].children.length * slideWidth + this.slider[0].children.length * this.grid_gap;
      if(fullwidth-drag<=this.slider[0].offsetWidth-slideWidth/2){
        this.currentIndex = 0;
      }
    } else {
      this.currentIndex = 0;
    }
    this.updateSlider();
  }
  prevBtn(){
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = 0;
      var slideWidth = this.slider[0].lastChild.offsetWidth;
      var fullwidth = this.slider[0].children.length * slideWidth;
      for(var i=0; i<this.slider[0].children.length; i++){
        this.currentIndex++;
        var drag = this.currentIndex * slideWidth;
        if(fullwidth-drag<=this.slider[0].offsetWidth+slideWidth/2){
          break;
        }
      }
    }
    this.updateSlider();
  }
  updateSlider() {
    var slideWidth = this.slider[0].lastChild.offsetWidth;
    var fullwidth = (this.slider[0].children.length * slideWidth + this.slider[0].children.length * this.grid_gap) - this.grid_gap;
    this.querySelectorAll('.wokiee-compare__container').forEach((item) => {
      const slideWidth = item.children[0].offsetWidth;
      item.style.transform = `translateX(${Math.max((this.currentIndex * (slideWidth + this.grid_gap)) * -1, this.offsetWidth - fullwidth)}px)`;
    });
  }
  resizeHandler(){
    var slideWidth = this.slider[0].lastChild.offsetWidth;
    var fullwidth = (this.slider[0].children.length * slideWidth + this.slider[0].children.length * this.grid_gap) - this.grid_gap;
    var sliderWidth = this.offsetWidth;

    if(fullwidth>sliderWidth){
      var max_count = Math.round((fullwidth-sliderWidth)/(slideWidth+this.grid_gap));
      if(this.currentIndex > max_count){
        this.currentIndex = max_count;
        this.updateSlider();
      }
    }
    if(fullwidth<=sliderWidth+20){
      this.querySelector('.wokiee-compare__buttons').classList.add('hide')
      this.querySelector('.wokiee-compare').classList.add('wokiee-compare--center');
    }
    else{
      this.querySelector('.wokiee-compare__buttons').classList.remove('hide');
      this.querySelector('.wokiee-compare').classList.remove('wokiee-compare--center');
    }

    this.querySelectorAll('.wokiee-compare__heading').forEach((item) => {
      if(window.innerWidth >= 577){
        item.style.width = fullwidth<sliderWidth?fullwidth+'px':'100%';
      }
      else{
        item.style.width = '100%';
      }
    });
  }
}
customElements.define('slider-slide', sliderSlide);