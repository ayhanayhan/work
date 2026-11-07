'use client';
/**
 * Homepage behavior owned by the React tree. No legacy <script> injection,
 * external CMS fetch, HTML replacement, mock content insertion, or innerHTML.
 * All visible copy and imagery live in static section JSX until CMS migration.
 */
import {useCallback,useEffect,useRef,useState,type MouseEvent,type FormEvent,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

type Props={children:ReactNode};
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollStep=(track:HTMLElement,selector:string)=>{
  const el=track.querySelector<HTMLElement>(selector);
  const gap=parseFloat(getComputedStyle(track).columnGap||getComputedStyle(track).gap||'0')||0;
  return el?el.getBoundingClientRect().width+gap:track.clientWidth;
};
const scrollCarousel=(root:HTMLElement|null,trackSelector:string,itemSelector:string,dir:number)=>{
  const track=root?.querySelector<HTMLElement>(trackSelector);
  if(track)track.scrollBy({left:dir*scrollStep(track,itemSelector),behavior:reduced()?'auto':'smooth'});
};
export default function HomeInteractions({children}:Props){
  const rootRef=useRef<HTMLDivElement>(null);
  const [drawer,setDrawer]=useState(false);
  const [mega,setMega]=useState<string|null>(null);
  const [banner,setBanner]=useState(true);
  const [langOpen,setLangOpen]=useState(false);
  const [faqOpen,setFaqOpen]=useState<number[]>([0]);
  const [heroOpen,setHeroOpen]=useState<number|null>(null);
  const [pressIndex,setPressIndex]=useState(0);
  const [pressHover,setPressHover]=useState(false);
  const [carouselState,setCarouselState]=useState<Record<string,{prev:boolean;next:boolean}>>({});
  const [headlineIndex,setHeadlineIndex]=useState(0);
  const [backLabelHost,setBackLabelHost]=useState<HTMLElement|null>(null);
  const closeMenu=useCallback(()=>{setDrawer(false);setMega(null)},[]);

  // The mobile submenu label is a React portal, never a textContent patch.
  useEffect(()=>{
    setBackLabelHost(rootRef.current?.querySelector<HTMLElement>('.tc-ui-back-label')||null);
  },[]);
  useEffect(()=>{
    if(!drawer)return;
    const nav=rootRef.current?.querySelector<HTMLElement>('.tc-navigation-panel');
    if(!nav)return;
    nav.querySelector<HTMLButtonElement>('.tc-ui-drawer-close')?.focus({preventScroll:true});
    const trap=(e:KeyboardEvent)=>{
      if(e.key!=='Tab')return;
      const focusables=Array.from(nav.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(el=>el.getClientRects().length>0);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    };
    document.addEventListener('keydown',trap);
    return()=>document.removeEventListener('keydown',trap);
  },[drawer]);
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 991px)');
    const onResize=()=>{if(!media.matches)closeMenu()};
    media.addEventListener('change',onResize);
    return()=>media.removeEventListener('change',onResize);
  },[closeMenu]);

  // Observe visibility/measurements, not text or data. React owns the page
  // and controls all stateful clicks; observers are only for CSS animations.
  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    document.documentElement.classList.add('site-ready','js-reveal');
    const reveal=root.querySelectorAll<HTMLElement>(
      '.tc-builder-section__card,.tc-sales-channels__reveal,.hrt-reveal,.tc-dashboard-radar__reveal');
    if(reduced()||typeof IntersectionObserver==='undefined'){
      reveal.forEach(el=>el.classList.add('is-visible','in-view'));
      return;
    }
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      const el=entry.target as HTMLElement;
      if(entry.isIntersecting)el.classList.add('is-visible','in-view');
      else if(el.classList.contains('tc-sales-channels__reveal'))el.classList.remove('in-view');
    }),{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
    reveal.forEach(el=>io.observe(el));
    const hero=root.querySelector('.tc-site-hero');
    const heroIO=hero?new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting))hero.classList.add('is-in');
    },{threshold:0.2}):null;
    if(hero&&heroIO)heroIO.observe(hero);
    return()=>{io.disconnect();heroIO?.disconnect()};
  },[]);

  // Keep the original fixed-header spacer aligned with the actual header
  // rather than injecting a second header or changing CSS geometry.
  useEffect(()=>{
    const root=rootRef.current,header=root?.querySelector<HTMLElement>('.tc-site-header');
    const spacer=root?.querySelector<HTMLElement>('.tc-ui-header-spacer');
    if(!header||!spacer)return;
    const sync=()=>{spacer.style.height=header.offsetHeight+'px'};
    sync();
    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(sync):null;
    ro?.observe(header);window.addEventListener('resize',sync);
    return()=>{ro?.disconnect();window.removeEventListener('resize',sync)};
  },[banner]);

  // React state controls original carousel button disabled states.
  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    for(const [kind,selector] of [
      ['showcase','.tc-showcase'],['blog','#tc-blog']
    ]){
      const container=root.querySelector<HTMLElement>(selector);
      if(!container)continue;
      const state=carouselState[kind];
      const prev=container.querySelector<HTMLButtonElement>(
        kind==='showcase'?'[data-dir="prev"]':'[data-tc-blog-prev]');
      const next=container.querySelector<HTMLButtonElement>(
        kind==='showcase'?'[data-dir="next"]':'[data-tc-blog-next]');
      if(prev)prev.disabled=!state?.prev;
      if(next)next.disabled=!state?.next;
    }
  },[carouselState]);

  // Banner dismissal survives the current tab, just as in the original page.
  useEffect(()=>{
    try{if(sessionStorage.getItem('tc-announcement-bar:ticarti-lansman-indirim-50')==='1')setBanner(false)}catch{}
  },[]);

  // Preserve the old three-set hero rail without cloneNode or script injection.
  // The three sets are already rendered declaratively by HeroCards.
  useEffect(()=>{
    const root=rootRef.current,viewport=root?.querySelector<HTMLElement>('#skViewport');
    const track=root?.querySelector<HTMLElement>('#skTrack');
    if(!viewport||!track)return;
    let period=0,programmatic=false,resizeTimer=0;
    const measure=()=>{
      if(window.matchMedia('(max-width: 1150px)').matches){period=0;viewport.scrollLeft=0;return;}
      const cards=Array.from(track.querySelectorAll<HTMLElement>('.tc-ui-card:not([data-clone])'));
      if(!cards.length)return;
      const gap=parseFloat(getComputedStyle(track).gap)||0;
      period=cards.reduce((sum,c)=>sum+c.getBoundingClientRect().width+gap,0);
      programmatic=true;
      viewport.scrollLeft=period+Math.max(0,(period-viewport.clientWidth)/2);
      requestAnimationFrame(()=>{programmatic=false});
    };
    const scroll=()=>{
      if(programmatic||period<=0)return;
      if(viewport.scrollLeft<period*0.6){
        programmatic=true;viewport.scrollLeft+=period;requestAnimationFrame(()=>{programmatic=false});
      }else if(viewport.scrollLeft>=period*2.4){
        programmatic=true;viewport.scrollLeft-=period;requestAnimationFrame(()=>{programmatic=false});
      }
    };
    const resize=()=>{clearTimeout(resizeTimer);resizeTimer=window.setTimeout(measure,180)};
    measure();document.fonts?.ready.then(measure);
    viewport.addEventListener('scroll',scroll,{passive:true});
    window.addEventListener('resize',resize);
    return()=>{clearTimeout(resizeTimer);viewport.removeEventListener('scroll',scroll);window.removeEventListener('resize',resize)};
  },[]);

  // Video play/pause and scroll visibility belong to the React lifecycle.
  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    const cleanup:Array<()=>void>=[];
    root.querySelectorAll<HTMLElement>('.video-section__inner').forEach(wrapper=>{
      const video=wrapper.querySelector<HTMLVideoElement>('.video-section__video');
      const toggle=wrapper.querySelector<HTMLButtonElement>('.video-section__toggle');
      if(!video)return;
      let userPaused=false;
      const onPlay=()=>wrapper.classList.add('is-playing');
      const onPause=()=>wrapper.classList.remove('is-playing');
      const onToggle=()=>{
        if(video.paused){userPaused=false;void video.play().catch(()=>{});}
        else{userPaused=true;video.pause();}
      };
      video.addEventListener('play',onPlay);video.addEventListener('pause',onPause);
      toggle?.addEventListener('click',onToggle);
      let io:IntersectionObserver|null=null;
      if(!reduced()&&'IntersectionObserver' in window){
        io=new IntersectionObserver(entries=>entries.forEach(e=>{
          if(e.isIntersecting){if(!userPaused)void video.play().catch(()=>{});}
          else video.pause();
        }),{threshold:0.35});
        io.observe(wrapper);
      }
      cleanup.push(()=>{io?.disconnect();video.pause();video.removeEventListener('play',onPlay);video.removeEventListener('pause',onPause);toggle?.removeEventListener('click',onToggle)});
    });
    return()=>cleanup.forEach(fn=>fn());
  },[]);

  // Touch scrolling stays native on vertical gestures; horizontal swipes snap
  // to the original cards. No re-created DOM or template strings.
  useEffect(()=>{
    if(!window.matchMedia('(pointer: coarse)').matches)return;
    const root=rootRef.current;if(!root)return;
    const cleanup:Array<()=>void>=[];
    for(const [selector,cardSelector] of [
      ['.tc-site-hero__viewport','.tc-ui-card'],
      ['.tc-showcase__track','.tc-showcase__item'],
      ['.tc-blog__track','.tc-blog__card']
    ]){
      const track=root.querySelector<HTMLElement>(selector);if(!track)continue;
      let startX=0,startY=0,initial=0,dragging=false,vertical=false;
      const onStart=(e:TouchEvent)=>{
        if(e.touches.length!==1)return;
        startX=e.touches[0].clientX;startY=e.touches[0].clientY;
        initial=track.scrollLeft;dragging=false;vertical=false;
      };
      const onMove=(e:TouchEvent)=>{
        if(e.touches.length!==1||vertical)return;
        const dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY;
        if(!dragging){if(Math.abs(dx)<9&&Math.abs(dy)<9)return;
          if(Math.abs(dy)>=Math.abs(dx)){vertical=true;return}dragging=true;}
        if(e.cancelable)e.preventDefault();
        track.scrollLeft=initial-dx;
      };
      const onEnd=(e:TouchEvent)=>{
        if(!dragging)return;
        dragging=false;
        const touch=e.changedTouches[0];if(!touch)return;
        const dx=touch.clientX-startX;
        const step=scrollStep(track,cardSelector),direction=Math.sign(dx);
        const jumps=Math.abs(dx)<35?0:Math.min(3,Math.max(1,Math.round(Math.abs(dx)/step)));
        const left=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,initial-direction*jumps*step));
        track.scrollTo({left,behavior:reduced()?'auto':'smooth'});
      };
      track.addEventListener('touchstart',onStart,{passive:true});
      track.addEventListener('touchmove',onMove,{passive:false});
      track.addEventListener('touchend',onEnd,{passive:true});
      cleanup.push(()=>{track.removeEventListener('touchstart',onStart);track.removeEventListener('touchmove',onMove);track.removeEventListener('touchend',onEnd)});
    }
    return()=>cleanup.forEach(fn=>fn());
  },[]);

  // Original rotating headline: state switches CSS classes; no DOM text edits.
  useEffect(()=>{
    const root=rootRef.current,section=root?.querySelector<HTMLElement>('.tc-animated-heading');
    const items=section?.querySelectorAll<HTMLElement>('.tc-animated-heading__item');
    const roller=section?.querySelector<HTMLElement>('.tc-animated-heading__roller');
    if(!section||!items?.length||!roller)return;
    const measure=()=>{const width=Math.max(...Array.from(items).map(x=>x.getBoundingClientRect().width));roller.style.width=Math.ceil(width+8)+'px'};
    measure();document.fonts?.ready.then(measure);
    window.addEventListener('resize',measure);
    if(reduced())return()=>window.removeEventListener('resize',measure);
    const timer=window.setInterval(()=>{if(!document.hidden)setHeadlineIndex(i=>(i+1)%items.length)},2400);
    return()=>{clearInterval(timer);window.removeEventListener('resize',measure)};
  },[]);
  useEffect(()=>{
    const root=rootRef.current,items=root?.querySelectorAll<HTMLElement>('.tc-animated-heading__item');
    items?.forEach((item,i)=>item.classList.toggle('is-active',i===headlineIndex));
  },[headlineIndex]);

  // The original card rails remain in the exact CSS structure.
  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    const configs=[
      {id:'showcase',track:'.tc-showcase__track'},
      {id:'blog',track:'.tc-blog__track'}
    ];
    const update=()=>setCarouselState(Object.fromEntries(configs.map(x=>{
      const t=root.querySelector<HTMLElement>(x.track);
      return [x.id,{prev:!!t&&t.scrollLeft>2,next:!!t&&t.scrollLeft<t.scrollWidth-t.clientWidth-2}];
    })));
    const rails=configs.map(x=>root.querySelector<HTMLElement>(x.track)).filter((x):x is HTMLElement=>!!x);
    rails.forEach(t=>t.addEventListener('scroll',update,{passive:true}));
    window.addEventListener('resize',update);update();
    return()=>{rails.forEach(t=>t.removeEventListener('scroll',update));window.removeEventListener('resize',update)};
  },[]);
  useEffect(()=>{
    const root=rootRef.current,press=root?.querySelector<HTMLElement>('.tc-press__carousel');
    if(!press||pressHover||reduced())return;
    const slides=press.querySelectorAll('.tc-press__slide');
    if(slides.length<2||press.dataset.autoplay!=='1')return;
    const speed=Math.max(1500,(Number(press.dataset.speed)||5)*1000);
    const id=window.setInterval(()=>setPressIndex(i=>(i+1)%slides.length),speed);
    return()=>clearInterval(id);
  },[pressHover]);
  useEffect(()=>{
    const root=rootRef.current,track=root?.querySelector<HTMLElement>('.tc-press__track');
    if(track)track.style.transform='translateX('+(-pressIndex*100)+'%)';
    const press=root?.querySelector<HTMLElement>('.tc-press__carousel');
    if(press){
      const single=press.querySelectorAll('.tc-press__slide').length<=1;
      press.querySelectorAll<HTMLButtonElement>('.tc-press__arrow').forEach(btn=>{btn.hidden=single});
    }
  },[pressIndex]);

  useEffect(()=>{
    const root=rootRef.current,header=root?.querySelector<HTMLElement>('.tc-site-header');if(!header)return;
    const menu=header.querySelector<HTMLElement>('.tc-navigation-panel');
    const overlay=header.querySelector<HTMLElement>('.tc-ui-drawer-overlay');
    header.classList.toggle('is-mobile-open',drawer);
    header.classList.toggle('is-submenu',!!mega&&drawer);
    document.documentElement.classList.toggle('tc-drawer-lock',drawer);
    document.body.classList.toggle('tc-drawer-lock',drawer);
    menu?.setAttribute('aria-modal',drawer?'true':'false');
    overlay?.classList.toggle('is-visible',drawer);
    const btn=header.querySelector('.tc-menu-toggle');
    btn?.setAttribute('aria-expanded',String(drawer));
    header.querySelectorAll<HTMLElement>('.has-mega').forEach(el=>{
      const active=el.dataset.megaSlug===mega;
      el.classList.toggle('is-open',active);el.setAttribute('aria-expanded',String(active));
    });
    header.querySelectorAll<HTMLElement>('[data-mega]').forEach(el=>el.classList.toggle('is-open',el.dataset.mega===mega));
    return()=>{document.documentElement.classList.remove('tc-drawer-lock');document.body.classList.remove('tc-drawer-lock')};
  },[drawer,mega]);

  useEffect(()=>{
    const root=rootRef.current,header=root?.querySelector<HTMLElement>('.tc-site-header');if(!header)return;
    let last=window.scrollY;
    const scroll=()=>{
      if(drawer||mega||window.scrollY<80)header.classList.remove('is-hidden');
      else if(window.scrollY>last+6)header.classList.add('is-hidden');
      else if(window.scrollY<last-6)header.classList.remove('is-hidden');
      last=window.scrollY;
    };
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){closeMenu();setLangOpen(false)}};
    window.addEventListener('scroll',scroll,{passive:true});
    window.addEventListener('keydown',key);
    return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('keydown',key)};
  },[drawer,mega,closeMenu]);
  useEffect(()=>{
    const root=rootRef.current,faq=root?.querySelectorAll<HTMLElement>('.tc-faq__item');
    faq?.forEach((item,i)=>{
      const active=faqOpen.includes(i),panel=item.querySelector<HTMLElement>('.tc-faq__panel');
      item.classList.toggle('is-open',active);
      item.querySelector('.tc-faq__question')?.setAttribute('aria-expanded',String(active));
      if(panel)panel.style.maxHeight=active?panel.scrollHeight+'px':'0px';
    });
  },[faqOpen]);

  const move=(kind:'showcase'|'blog'|'hero',direction:number)=>{
    const root=rootRef.current;
    if(kind==='hero')scrollCarousel(root,'.tc-site-hero__viewport','.tc-ui-card',direction);
    else if(kind==='showcase')scrollCarousel(root,'.tc-showcase__track','.tc-showcase__item',direction);
    else scrollCarousel(root,'.tc-blog__track','.tc-blog__card',direction);
  };

  const onClick=(event:MouseEvent<HTMLDivElement>)=>{
    const root=rootRef.current,target=event.target as HTMLElement;if(!root)return;
    const el=(selector:string)=>target.closest<HTMLElement>(selector);
    if(el('[data-tc-ui-topbar-close]')){try{sessionStorage.setItem('tc-announcement-bar:ticarti-lansman-indirim-50','1')}catch{}setBanner(false);return;}
    if(el('.tc-menu-toggle,.tc-ui-drawer-close')){
      setDrawer(v=>!v);setMega(null);return;
    }
    if(el('.tc-ui-drawer-overlay')){closeMenu();return;}
    if(el('.tc-ui-back')){setMega(null);return;}
    const trigger=el('.primary-menu a.has-mega[data-mega-slug]');
    if(trigger){event.preventDefault();setMega(s=>s===trigger.dataset.megaSlug?null:trigger.dataset.megaSlug||null);return;}
    const faq=el('.tc-faq__question');
    if(faq){const item=faq.closest('.tc-faq__item'),items=Array.from(root.querySelectorAll('.tc-faq__item')),i=items.indexOf(item!);if(i>=0)setFaqOpen(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i]);return;}
    const arrow=el('.tc-showcase [data-dir],.tc-site-hero__arrow');
    if(arrow){move(arrow.closest('.tc-showcase')?'showcase':'hero',arrow.dataset.dir==='next'?1:-1);return;}
    const blogArrow=el('[data-tc-blog-prev],[data-tc-blog-next]');
    if(blogArrow){move('blog',blogArrow.hasAttribute('data-tc-blog-next')?1:-1);return;}
    const pressArrow=el('.tc-press__arrow[data-dir]');
    if(pressArrow){
      const count=root.querySelectorAll('.tc-press__slide').length;
      if(count>1)setPressIndex(i=>(i+(pressArrow.dataset.dir==='next'?1:-1)+count)%count);
      return;
    }
    const plus=el('.tc-ui-card__plus');
    if(plus){
      event.preventDefault();
      const card=plus.closest('.tc-ui-card'),cards=Array.from(root.querySelectorAll('.tc-site-hero__track .tc-ui-card'));
      const i=cards.indexOf(card!);
      if(i>=0)setHeroOpen(v=>v===i?null:i);
      return;
    }
    if(el('.lang-toggle')){event.preventDefault();setLangOpen(v=>!v);return;}
    if(el('a[href]')){closeMenu();setLangOpen(false);}
  };
  useEffect(()=>{
    const root=rootRef.current;
    root?.querySelectorAll('.tc-ui-card').forEach((item,i)=>item.classList.toggle('is-open',heroOpen===i));
  },[heroOpen]);
  useEffect(()=>{
    const el=rootRef.current?.querySelector('.lang-wrap');
    el?.classList.toggle('is-open',langOpen);
    el?.querySelector('.lang-toggle')?.setAttribute('aria-expanded',String(langOpen));
  },[langOpen]);
  useEffect(()=>{
    const bar=rootRef.current?.querySelector<HTMLElement>('[data-tc-ui-topbar]');
    if(bar)bar.style.display=banner?'':'none';
  },[banner]);

  const onMouseOver=(event:MouseEvent<HTMLDivElement>)=>{
    if(window.matchMedia('(max-width: 991px)').matches)return;
    const target=event.target as HTMLElement;
    if(target.closest('.tc-press__carousel'))setPressHover(true);
    const trigger=target.closest<HTMLElement>('.primary-menu a.has-mega[data-mega-slug]');
    if(trigger?.dataset.megaSlug)setMega(trigger.dataset.megaSlug);
  };
  const onMouseOut=(event:MouseEvent<HTMLDivElement>)=>{
    if(window.matchMedia('(max-width: 991px)').matches)return;
    const target=event.target as HTMLElement;
    const menu=target.closest<HTMLElement>('.tc-mega-navigation,.primary-menu');
    const destination=event.relatedTarget as Node|null;
    const press=target.closest<HTMLElement>('.tc-press__carousel');
    if(press&&(!destination||!press.contains(destination)))setPressHover(false);
    if(menu&&(!destination||!menu.contains(destination))){
      // Allow pointer transition from trigger row to mega navigation.
      if(menu.classList.contains('tc-mega-navigation'))setMega(null);
    }
  };
  const onChange=(event:FormEvent<HTMLDivElement>)=>{
    const target=event.target as HTMLSelectElement;
    if(target.matches('select.lang-select')){
      const select=target as HTMLSelectElement;const option=select.selectedOptions[0];
      if(option?.dataset.url)window.location.assign(option.dataset.url);
    }
  };
  return <div className="tc-page-home" ref={rootRef} onClick={onClick} onChange={onChange} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
    {children}
    {backLabelHost?createPortal(mega==='companies'?'Çözümler':mega==='resources'?'Kaynaklar':'',backLabelHost):null}
  </div>;
}
