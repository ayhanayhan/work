 export function startNav(obj) {
    const item = new Nav(obj);
}
class Nav{
  constructor(obj) {
    this.obj = obj;
    this.firstActivityDetected = false;
    this.init();
  }
  init() {
    if(Shopify.designMode){
      this.handleFirstActivity();
    }
    else{
      this.setupEventListeners();
    }
  }
  setupEventListeners() {
    const events = ['touchstart','touchmove','touchend','click','scroll'];
    events.forEach(event => {
      document.addEventListener(event, this.handleFirstActivity.bind(this), {
        once: true,
        passive: true
      });
    });
  }
  handleFirstActivity() {
    if (this.firstActivityDetected) return;
    this.firstActivityDetected = true;
    this.createActivityObject();
    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();

    const events = ['touchstart', 'touchmove', 'touchend', 'click', 'scroll'];
    events.forEach(event => {
      document.removeEventListener(event, this.handleFirstActivity.bind(this));
    });
  }
  createActivityObject() {
    this.obj.classList.add('activated');
  }
  handleResize() {
    const screenWidth = window.innerWidth;
    if (screenWidth > 1024) {
        this.removeResponsiveElement();
    }
    else {
        if (!this.responsiveElement || !document.body.contains(this.responsiveElement)) {
            this.setupResponsiveElement();
        } else {
            this.updateResponsiveElementHeight();
        }
    }
  }
  setupResponsiveElement() {
    this.responsiveElement = document.createElement('div');
    this.responsiveElement.className = 'nav-responsive-spacer';
    document.body.appendChild(this.responsiveElement);
    this.updateResponsiveElementHeight();
  }
  updateResponsiveElementHeight() {
    if (!this.responsiveElement) return;
    const navHeight = this.obj.offsetHeight;
    this.responsiveElement.style.height = `${navHeight}px`;
  }
  removeResponsiveElement() {
    if (this.responsiveElement && document.body.contains(this.responsiveElement)) {
      document.body.removeChild(this.responsiveElement);
    }
  }
}