/* Ticarti.com content binding — no layout, CSS or animation replacement.
 * Never destroys an element unless the admin intentionally changes a repeater list.
 * If the CMS is unavailable, original source HTML remains untouched.
 */
(function () {
  'use strict';
  var API = '/api/v1/public/website';
  var LANG = (document.documentElement.getAttribute('lang') || 'tr').split('-')[0].toLowerCase();
  var selectors = {
    hero: '.tc-site-hero', animated: '.tc-animated-heading', builder: '.tc-builder-section',
    radar: '.tc-dashboard-radar', channels: '.tc-sales-channels', showcase: '.tc-showcase',
    references: '.tc-press', bottomCta: '.tc-bottom-cta', blog: '#tc-blog', faq: '#tc-faq'
  };
  var headings = {
    hero: {heading: '.tc-site-hero__h1', description: '.tc-site-hero__sub', offer: '.tc-hero-offer'},
    radar: {heading: '.tc-dashboard-radar__heading', description: '.tc-dashboard-radar__subtitle'},
    channels: {heading: '.tc-sales-channels__heading', description: '.tc-sales-channels__intro'},
    showcase: {heading: '.tc-showcase__heading', description: '.tc-showcase__intro'},
    references: {heading: '.tc-press__right .tc-press__title'},
    bottomCta: {heading: '.tc-bottom-cta__heading', offer: '.tc-bottom-cta__offer'},
    blog: {heading: '#tc-blog-title', description: '.tc-blog__heading p'},
    faq: {heading: '.tc-faq__title', description: '.tc-faq__subtitle'}
  };
  function translation(field) {
    if (!field || typeof field !== 'object') return '';
    return String(field[LANG] || field.tr || field.en || '').trim();
  }
  function element(root, selector) {return root && root.querySelector(selector);}
  function text(root, selector, value) {
    if (!value) return;
    var el = element(root, selector);
    if (el && el.textContent.trim() !== value) el.textContent = value;
  }
  function safeUrl(value) {
    if (typeof value !== 'string') return null;
    var s = value.trim();
    if (s.startsWith('../assets/') || s.startsWith('/assets/') || s.startsWith('../../assets/')) return s;
    if (s.startsWith('https://')) return s;
    return null;
  }
  function safeHref(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var s = value.trim();
    if (/^https:\/\//.test(s) || /^\.{0,2}\/?[a-zA-Z0-9_\-./#?=&%]+$/.test(s) && !s.includes(':')) return s;
    return null;
  }
  function setImage(el, value) {
    var url = safeUrl(value);
    if (el && url && el.getAttribute('src') !== url) el.setAttribute('src', url);
  }
  function bindFields(root, module) {
    var map = headings[module.id] || {};
    for (var key in map) {
      var v = translation(module.fields && module.fields[key]);
      if (!v) continue;
      if (module.id === 'references' && key === 'heading') {
        var heading = element(root, map[key]);
        if (heading) {
          var spans = heading.querySelectorAll(':scope > span');
          if (spans.length >= 2) {
            var split = v.indexOf(',');
            if (split >= 0) {
              spans[0].textContent = v.slice(0, split + 1).trim();
              spans[1].textContent = v.slice(split + 1).trim();
            } else {spans[0].textContent = v;spans[1].textContent = '';}
          }
        }
        continue;
      }
      if (module.id === 'hero' && key === 'heading') {
        var h = element(root, map[key]);
        if (h && h.textContent.trim() !== v) {
          var br = h.querySelector('br');
          if (br) {
            var halves = v.split(/\n/);
            if (halves.length === 1) {
              var source = v.indexOf('14 gün');
              if (source > 0) halves = [v.slice(0, source).trim(), v.slice(source).trim()];
            }
            if (halves.length >= 2) {
              h.replaceChildren(document.createTextNode(halves[0]),document.createElement('br'),document.createTextNode(halves.slice(1).join(' ')));
            } else h.textContent = v;
          } else h.textContent = v;
        }
        continue;
      }
      text(root, map[key], v);
    }
    if (module.id === 'animated') {
      text(root, '.tc-animated-heading__sr', translation(module.fields && module.fields.heading));
      text(root, '.tc-animated-heading__static', translation(module.fields && module.fields.description));
    }
  }
  function reorderRepeater(module, root, parentSelector, childSelector, updateNode, special) {
    if (!Array.isArray(module.items) || !module.items.length) return;
    var parent = element(root, parentSelector);
    if (!parent) return;
    var original = Array.from(parent.querySelectorAll(':scope > ' + childSelector));
    if (!original.length) return;
    var records = module.items.filter(function (x) {return x && x.enabled !== false;});
    var nodes = records.map(function (item, index) {
      var source = original.find(function (node) {return node.getAttribute('data-ticarti-entry') === item.id;});
      if (!source && /^item-\d+$/.test(item.id)) source = original[Number(item.id.slice(5)) - 1];
      var node = source || original[Math.min(index, original.length - 1)].cloneNode(true);
      node.setAttribute('data-ticarti-entry', item.id);
      updateNode(node, item, index, !source);
      return node;
    });
    // Only move DOM nodes if the sequence or number actually changed.
    var same = nodes.length === original.length && nodes.every(function (n,i) {return n === original[i];});
    if (!same) parent.replaceChildren.apply(parent,nodes);
    if (special) special(nodes);
  }
  function faqBind(nodes) {
    nodes.forEach(function (node,index) {
      var button=element(node,'.tc-faq__question');
      var panel=element(node,'.tc-faq__panel');
      if (!button || !panel) return;
      var id='tc-cms-faq-'+index;
      button.id=id+'-heading';panel.id=id+'-panel';
      button.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',button.id);
      if (!button.dataset.ticartiBound) {
        button.dataset.ticartiBound='1';
        // Existing buttons keep their original faq.js handler. New clones get one here.
        if (!button.dataset.ticartiLegacy) {
          button.addEventListener('click',function () {
            var next=!node.classList.contains('is-open');
            node.classList.toggle('is-open',next);
            button.setAttribute('aria-expanded',String(next));
            panel.style.maxHeight=next ? panel.scrollHeight+'px' : '0px';
          });
        }
      }
      if (node.classList.contains('is-open')) panel.style.maxHeight=panel.scrollHeight+'px';
    });
  }
  function bindModule(module) {
    var root=document.querySelector(selectors[module.id]);
    if (!root) return;
    // Server-rendered FAQ already matches JSON-LD; never replace or double-bind it.
    if (module.id === 'faq' && root.hasAttribute('data-tc-ssr-faq')) return;
    // Existing design and DOM are preserved until admins explicitly change data.
    if (module.enabled === false) {root.hidden=true;return;}
    root.hidden=false;bindFields(root,module);
    if (module.id === 'builder') {
      reorderRepeater(module,root,'.tc-builder-section__grid','.tc-builder-section__card',function(node,item){
        text(node,'.tc-builder-section__title',translation(item.fields.heading));
        text(node,'.tc-builder-section__text',translation(item.fields.description));
        setImage(element(node,'img'),item.assets && item.assets.image);
      });
    }
    if (module.id === 'animated') {
      reorderRepeater(module,root,'.tc-animated-heading__stack','.tc-animated-heading__item',function(node,item){
        if (item.fields && item.fields.heading) node.textContent=translation(item.fields.heading)||node.textContent;
      });
    }
    if (module.id === 'radar') {
      reorderRepeater(module,root,'.tc-dashboard-radar__cards','.tc-dashboard-radar__card',function(node,item){
        text(node,'.tc-dashboard-radar__card-title',translation(item.fields.heading));
        text(node,'.tc-dashboard-radar__card-body',translation(item.fields.description));
        var img=element(node,'.tc-dashboard-radar__card-icon');
        if(img&&safeUrl(item.assets&&item.assets.image)&&img.getAttribute('src')!==safeUrl(item.assets.image))img.removeAttribute('srcset');
        setImage(img,item.assets&&item.assets.image);
      });
    }
    if (module.id === 'channels') {
      reorderRepeater(module,root,'.tc-sales-channels__grid','.tc-sales-channels__col',function(node,item){
        text(node,'.tc-sales-channels__text',translation(item.fields.description));
        text(node,'.tc-sales-channels__link-label',translation(item.fields.button));
        var a=element(node,'.tc-sales-channels__link'),href=safeHref(item.links&&item.links.href);
        if(a&&href)a.setAttribute('href',href);
      });
    }
    if (module.id === 'showcase') {
      reorderRepeater(module,root,'.tc-showcase__track','.tc-showcase__item',function(node,item){
        text(node,'.tc-showcase__name',translation(item.fields.heading));
        text(node,'.tc-showcase__role',translation(item.fields.role));
        text(node,'.tc-showcase__description',translation(item.fields.description));
        text(node,'.tc-showcase__link span',translation(item.fields.button));
        setImage(element(node,'.tc-showcase__image'),item.assets && item.assets.image);
        var a=element(node,'.tc-showcase__link'),href=safeHref(item.links&&item.links.href);
        if(a&&href)a.setAttribute('href',href);
      });
    }
    if (module.id === 'references') {
      reorderRepeater(module,root,'.tc-press__awards-row','div',function(node,item){
        var img=element(node,'img');var heading=translation(item.fields.heading);
        setImage(img,item.assets&&item.assets.image);
        if(img&&heading)img.alt=heading;
        var span=element(node,'span');
        if (span&&heading)span.textContent=heading;
        if(!span&&heading){span=document.createElement('span');span.textContent=heading;node.appendChild(span);}
        var description=translation(item.fields.description);
        if(description)node.setAttribute('title',description);
        var href=safeHref(item.links&&item.links.href);
        if(href){
          node.setAttribute('role','link');node.setAttribute('tabindex','0');
          node.onclick=function(){location.assign(href);};
          node.onkeydown=function(e){if(e.key==='Enter')location.assign(href);};
        }else{node.removeAttribute('role');node.removeAttribute('tabindex');node.onclick=null;node.onkeydown=null;}
      });
    }
    if (module.id === 'faq') {
      var parent=element(root,'.tc-faq__list');
      if(parent){parent.querySelectorAll('.tc-faq__question').forEach(function(b){b.dataset.ticartiLegacy='1';});}
      reorderRepeater(module,root,'.tc-faq__list','.tc-faq__item',function(node,item,index,isClone){
        if (isClone) {var clonedButton=element(node,'.tc-faq__question');if(clonedButton)delete clonedButton.dataset.ticartiLegacy;}
        text(node,'.tc-faq__q-text',translation(item.fields.question));
        text(node,'.tc-faq__answer p',translation(item.fields.answer));
      },faqBind);
    }
  }
  fetch(API+'/home?lang='+encodeURIComponent(LANG),{credentials:'omit'})
    .then(function(response){if(!response.ok)throw new Error('No CMS');return response.json();})
    .then(function(data){if(!Array.isArray(data.modules)||data.version===0)return;data.modules.forEach(bindModule);})
    .catch(function(){/* Static HTML is a deliberate safe fallback. */});
})();
