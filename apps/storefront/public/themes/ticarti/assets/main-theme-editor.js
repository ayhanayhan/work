document.addEventListener('Ticarti:section:load', Ticarti_load_event);
document.addEventListener('Ticarti:section:select', Ticarti_load_event);
document.addEventListener('Ticarti:section:deselect', Ticarti_deselect_event);
document.addEventListener('Ticarti:section:unload', Ticarti_unload_event);

function Ticarti_load_event(event) {
  var item = event.target.querySelector('[data-section-name="popup-search-modules"]');
  if(item){
    if (item.getAttribute('data-section-name') === 'popup-search-modules') {
      document.querySelector('[data-modal="#header-modal-search"] a').dispatchEvent(new CustomEvent('click'));
    }
  }

  var item = event.target.querySelector('.section-header');
  var item2 = document.querySelector('[data-section-name="megamenu-modules"]');
  if(item && item2){
    window.dispatchEvent(new Event('reinit_megamenu', { bubbles: true }));
  }
}
function Ticarti_deselect_event(event) {
  var item = event.target.querySelector('[data-section-name="popup-search-modules"]');
  if(item){
    if (item.getAttribute('data-section-name') === 'popup-search-modules') {
      document.querySelector('#header-modal-search .popup-modal__toggle').dispatchEvent(new CustomEvent('click'));
    }
  };
}
function Ticarti_unload_event(event) {
  var item = event.target.querySelector('[data-section-name="popup-search-modules"]');
  if(item){
    if (item.getAttribute('data-section-name') === 'popup-search-modules' ) {
      setTimeout(function(){
        if(document.querySelector('[data-section-name="popup-search-modules"]')) return false;
        var html = document.querySelector('.header-modal-search__external-content');
        if(!html) return false;
        html.innerHTML = '';
      }, 1000)
    }
  };

  var item = event.target.querySelector('[data-section-name="megamenu-modules"]');
  if(item){
    var item2 = document.querySelectorAll('[data-parent-megamenu] [data-megamenu-index]');
    if(item2.length){
      item2.forEach((elem) => {
        elem.remove();
      });
    }
  }

  document.querySelectorAll('.promotion-popup').forEach((elem) => {
    elem.remove();
  });
}