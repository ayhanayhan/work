class headerMenuHandler extends HTMLElement {
  constructor() {
    super();
    this.menuholder = this.querySelector('.vertical-menu__items');
    this.button = this.querySelector('.vertical-menu__show-more');
    this.extra_height = Number(this.getAttribute("data-extra-height"));
    Shopify.designMode?setTimeout(this.resizeMenu.bind(this), 400):false;
    this.createEvents();
    var _this = this;
    if(!Shopify.designMode){
      document.addEventListener("DOMContentLoaded", (event) => {
        setTimeout(_this.resizeMenu.bind(_this), 200);
        setTimeout(_this.resizeMenu.bind(_this), 1000);
      });
      document.addEventListener('visibilitychange', function(){
        if(!document.hidden) {
          setTimeout(_this.resizeMenu.bind(_this), 200);
        }
      });
    }
  }
  resizeMenu(){
    const main_content = document.getElementById('MainContent'),
          data_menu_opened = document.querySelector('[data-menu-opened]'),
          items_top_position = window.scrollY + this.menuholder.getBoundingClientRect().top;

    if(!main_content.children.length) return;
    this.querySelectorAll('.hidden-menu-item').forEach((item) => {item.classList.remove('hidden-menu-item')});

    if(data_menu_opened || main_content.classList.contains('menu-opened-by-default')){
      const index = Number(data_menu_opened.getAttribute('data-menu-opened')) - 1,
      		section_height = window.scrollY + main_content.children[index].getBoundingClientRect().bottom,
      		menu_top_position = (this.closest('.menu-opened-by-default') ? 0 : window.scrollY) + this.getBoundingClientRect().top;
      var height = section_height - menu_top_position;

      if(this.closest('.menu-opened-by-default')){
        height = Math.min(height, this.menuholder.offsetHeight + 20);
		height = height < -1 ? this.menuholder.offsetHeight + 20 : height;
      }
      this.style.height = '100%';
      this.style.minHeight = (height+this.extra_height)+'px';
      this.renderItems(items_top_position,height);
    }
    else{
      this.renderItems(items_top_position,620);
    }
    this.hasAttribute('hide-before-load') && this.removeAttribute('hide-before-load');
  }
  renderItems(items_top_position,height){
    var hide_item = true;
    var offsetmain = this.menuholder.children[0].offsetTop;
    for(var i=this.menuholder.children.length-1; i>=0; i--){
      var item = this.menuholder.children[i],
          y = item.offsetTop + offsetmain + item.offsetHeight;
      if(this.menuholder.children.length-1 == i && y <= height){
        this.button.classList.add('hide');
        return 'break';
      }
      else if(y > height){
        this.button.classList.contains('hide') && this.button.classList.remove('hide');
        item.classList.add('hidden-menu-item');
      }
      else{
        if(hide_item){
          hide_item = false;
          y > height-this.button.offsetHeight-15 && item.classList.add('hidden-menu-item');
        }
      }
    }
  }
  resizeMenuEvent(){
    setTimeout(this.resizeMenu.bind(this), 800);
  }
  createEvents(){
    window.addEventListener('resize', this.resizeMenuEvent.bind(this));
    this.button.addEventListener('click', this.clickHandler.bind(this));
  }
  clickHandler(event){
    if(this.button.classList.contains('active')){
      this.classList.remove('menu-show-items');
      setTimeout(this.hideItems.bind(this), 0);         
    }
    else{
      this.classList.add('menu-opened');
      this.button.classList.add('active');
      setTimeout(this.showItems.bind(this), 0);
    }
  }
  showItems(){
    this.classList.add('menu-show-items');
  }
  hideItems(){
    this.classList.remove('menu-opened');
    this.button.classList.remove('active');
    window.dispatchEvent(new Event('forStickyHeader'));
  }
}
customElements.define('vertical-menu', headerMenuHandler);
