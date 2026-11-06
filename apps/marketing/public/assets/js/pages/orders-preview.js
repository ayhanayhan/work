/* Ticarti / Homepage: UI-only sample order flow. No external order data. */
(() => {
  'use strict';
  const list = document.querySelector('[data-tc-orders-preview]');
  if (!list) return;
  const assetRoot = '../assets/images/marketplaces/';
  const orders = [
    {market:'Pazarama', logo:'pazarama.svg', id:'PZ-7186', items:1, price:'₺649,90'},
    {market:'ÇiçekSepeti', logo:'ciceksepeti.svg', id:'CS-5932', items:2, price:'₺1.120,00'},
    {market:'PttAVM', logo:'epttavm.svg', id:'PT-2647', items:1, price:'₺479,90'},
    {market:'Trendyol', logo:'trendyol.svg', id:'TR-4822', items:3, price:'₺2.349,00'},
    {market:'Hepsiburada', logo:'hepsiburada.svg', id:'HB-3269', items:1, price:'₺1.099,00'},
    {market:'n11', logo:'n11.svg', id:'N11-1955', items:2, price:'₺925,50'}
  ];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let timer = null;
  let visible = false;
  const MAX_VISIBLE = 4;
  const make = (o) => {
    const row = document.createElement('div');
    row.className = 'tk__row tc-order';
    const logo = document.createElement('img');
    logo.src = assetRoot + o.logo;
    logo.alt = o.market;
    logo.className = 'tc-order__logo';
    const info = document.createElement('div');
    info.className = 'tk__info';
    const number = document.createElement('span');
    number.className = 'tk__role';
    number.textContent = 'Sipariş #' + o.id;
    const detail = document.createElement('span');
    detail.className = 'tk__meta';
    detail.append(document.createTextNode(o.market + ' · ' + o.items + ' ürün'));
    const price = document.createElement('span');
    price.className = 'tc-order__price';
    price.textContent = o.price;
    detail.append(price);
    info.append(number, detail);
    const badge = document.createElement('span');
    badge.className = 'tk__badge';
    badge.textContent = 'Yeni';
    row.append(logo, info, badge);
    return row;
  };
  let animating = false;
  const add = () => {
    if (animating) return;
    const row = make(orders[index++ % orders.length]);
    list.prepend(row);
    const clear = () => {
      while (list.children.length > MAX_VISIBLE) list.lastElementChild.remove();
      animating = false;
    };
    if (reduced.matches || !list.animate) {
      clear();
      return;
    }
    animating = true;
    // New order slides in at the top, pushing the oldest row out of view.
    const distance = row.getBoundingClientRect().height;
    const animation = list.animate([
      {transform: 'translateY(-' + distance + 'px)'},
      {transform: 'translateY(0px)'}
    ], {duration: 460, easing: 'cubic-bezier(.22,.61,.36,1)'});
    animation.finished.then(clear, clear);
  };
  const sync = () => {
    const run = visible && !document.hidden && !reduced.matches;
    if (run && !timer) timer = setInterval(add, 2800);
    if (!run && timer) {clearInterval(timer);timer=null;}
  };
  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver((entries)=> {visible=entries.some(e=>e.isIntersecting);sync();},{threshold:0.1});
    observer.observe(list);
  } else visible=true;
  document.addEventListener('visibilitychange',sync);
  if (reduced.addEventListener) reduced.addEventListener('change',sync);
  else if (reduced.addListener) reduced.addListener(sync);
  sync();
})();
