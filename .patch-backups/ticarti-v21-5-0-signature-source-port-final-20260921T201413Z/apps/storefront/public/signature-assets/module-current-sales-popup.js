 export function init(obj) {
    const item = new Promo(obj);
}
class Promo{
  constructor(obj) {
    this.obj = obj;
    this.promo   = obj.querySelector('.current-sales-popup__block__container');
    this.start   = Number(obj.getAttribute('data-start'));
    this.nextmin = Number(obj.getAttribute('data-min'));
    this.nextmax = Number(obj.getAttribute('data-max'));
    this.timer   = false;
    this.lastindexel  = -1;
    this.lastactiveel = false;
    this.init();
    this.initEvents();
  }
  init(){
    if(window.innerWidth > 576 && window.innerWidth <= 1024 && this.obj.classList.contains('csld-hide-st')){
      return false;
    }
    if(window.innerWidth <= 576 && this.obj.classList.contains('csld-hide-sp')){
      return false;
    }
    var delay = this.start=="inited"?this.getRndInteger(this.nextmin, this.nextmax):this.start;
    this.start="inited";
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        var index = this.getProductIndex();
        var nextel = this.promo.children[index];
        this.setInfo(nextel);
        this.lastactiveel&&this.lastactiveel.classList.remove('active');
        this.lastactiveel = nextel;
        this.lastindexel  = index
        setTimeout(function(){
          nextel.classList.add('active');
        }, 300);
        this.init();
      },
      delay
    );
  }
  initEvents(){
    this.obj.querySelectorAll('.current-sales-popup__container__close').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.target.closest('.current-sales-popup__block').classList.remove('active');
        this.lastindexel  = -1;
        this.lastactiveel = false;
        this.init();
      });
    });
  }
  setInfo(el){
    var txt = el.getAttribute('data-text'),
        min = Number(el.getAttribute('data-min')),
        max = Number(el.getAttribute('data-max')),
        rm = this.getRndInteger(min, max);
    if(txt.indexOf('||') > -1){
      txt = txt.split('||');
      txt = txt[this.getRndInteger(0, txt.length)];
    }
    el.querySelector('.current-sales-popup__block__content__message__time').innerHTML = rm;
    el.querySelector('.current-sales-popup__block__content__message__text').innerHTML = txt;
  }
  getProductIndex(){
    var min = 0,
        max = this.promo.children.length;
    return this.getRndInteger(min, max);
  }
  getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }
}