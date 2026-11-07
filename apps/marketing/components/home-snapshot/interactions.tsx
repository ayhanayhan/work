'use client';
/**
 * Homepage behavior owned by the React tree. No legacy <script> injection,
 * external CMS fetch, HTML replacement, mock content insertion, or innerHTML.
 * All visible copy and imagery live in static section JSX until CMS migration.
 */
import {useCallback,useEffect,useRef,useState,type MouseEvent,type ChangeEvent,type FormEvent,type ReactNode} from 'react';

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
const phoneRules:Record<string,RegExp>={
  TR:/^5\d{9}$/,US:/^[2-9]\d{2}[2-9]\d{6}$/,CA:/^[2-9]\d{2}[2-9]\d{6}$/,
  GB:/^[1-9]\d{9}$/,DE:/^[1-9]\d{5,12}$/,FR:/^[1-9]\d{8}$/,
  NL:/^[1-9]\d{8}$/,BE:/^[1-9]\d{7,8}$/,AT:/^[1-9]\d{3,12}$/,
  CH:/^[1-9]\d{8}$/,IT:/^\d{6,11}$/,ES:/^[6-9]\d{8}$/,
  PT:/^[29]\d{8}$/,BG:/^[1-9]\d{7,8}$/,RO:/^[1-9]\d{8}$/,
  GR:/^[1269]\d{9}$/,CY:/^[2-9]\d{7}$/,AZ:/^[1-9]\d{8}$/,
  GE:/^[1-9]\d{8}$/,UA:/^[1-9]\d{8}$/,RU:/^[3489]\d{9}$/,
  AE:/^[1-9]\d{7,8}$/,SA:/^[1-9]\d{8}$/,QA:/^[3-7]\d{7}$/,
  KW:/^[1-9]\d{7}$/,IQ:/^[1-9]\d{7,9}$/,IR:/^[1-9]\d{9}$/,
  EG:/^[1-9]\d{8,9}$/,MA:/^[1-9]\d{8}$/,IN:/^[6-9]\d{9}$/,
  PK:/^3\d{9}$/,AU:/^[1-9]\d{8}$/
};
function validatePhone(input:HTMLInputElement,option:HTMLOptionElement|undefined){
  const raw=input.value.trim();
  if(!raw)return 'Telefon numaranızı girin.';
  const dial=option?.value||'+90',country=option?.dataset.country||'TR';
  let value=raw.startsWith(dial)?raw.slice(dial.length).trim():raw;
  if(!/^[0-9 ()-]+$/.test(value))return 'Yalnızca rakam, boşluk, kısa çizgi ve parantez kullanın.';
  let digits=value.replace(/\D/g,'');
  if(country!=='IT'&&digits.startsWith('0'))digits=digits.slice(1);
  if(!phoneRules[country]?.test(digits)||!/^\+[1-9]\d{7,14}$/.test(dial+digits))
    return 'Seçilen ülkeye uygun geçerli bir telefon numarası girin.';
  return '';
}

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
  const [formState,setFormState]=useState<Record<string,{dial:string;flag:string;error:string;kvkk:string;value:string;checked:boolean}>>({});
  const [headlineIndex,setHeadlineIndex]=useState(0);
  const closeMenu=useCallback(()=>{setDrawer(false);setMega(null)},[]);

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
  const updateForm=(form:HTMLFormElement,change:Partial<{dial:string;flag:string;error:string;kvkk:string;value:string;checked:boolean}>)=>{
    const key=form.dataset.ticartiForm||'hero';
    setFormState(current=>({...current,[key]:{dial:'+90',flag:'🇹🇷',error:'',kvkk:'',value:'',checked:false,...current[key],...change}}));
  };
  const getForm=(form:HTMLFormElement)=>{
    const input=form.querySelector<HTMLInputElement>('input[type=tel]');
    const option=form.querySelector<HTMLSelectElement>('select.tc-country-code')?.selectedOptions[0];
    return {input,option};
  };

  const onClick=(event:MouseEvent<HTMLDivElement>)=>{
    const root=rootRef.current,target=event.target as HTMLElement;if(!root)return;
    const el=(selector:string)=>target.closest<HTMLElement>(selector);
    if(el('[data-tc-ui-topbar-close]')){setBanner(false);return;}
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

  const onChange=(event:ChangeEvent<HTMLDivElement>)=>{
    const target=event.target as HTMLInputElement;
    const form=target.closest<HTMLFormElement>('[data-tc-callback]');
    if(form){
      const {input,option}=getForm(form);
      if(target.matches('select.tc-country-code')){
        updateForm(form,{dial:option?.value||'+90',flag:option?.dataset.flag||'🇹🇷',error:''});
      }else if(target.matches('input[type=tel]')){
        updateForm(form,{value:input?.value||'',error:''});
      }else if(target.name==='kvkk_read'){
        updateForm(form,{checked:target.checked,kvkk:''});
      }
    }
    if(target.matches('select.lang-select')){
      const select=target as HTMLSelectElement;const option=select.selectedOptions[0];
      if(option?.dataset.url)window.location.assign(option.dataset.url);
    }
  };
  const onSubmit=(event:FormEvent<HTMLDivElement>)=>{
    const form=(event.target as Element).closest<HTMLFormElement>('[data-tc-callback]');
    if(!form)return;
    event.preventDefault();
    const {input,option}=getForm(form);
    if(!input)return;
    const error=validatePhone(input,option);
    const consent=form.querySelector<HTMLInputElement>('input[name=kvkk_read]');
    const kvkk=consent&&!consent.checked?'Devam etmek için KVKK aydınlatmasını okuyup kutuyu işaretleyin.':'';
    updateForm(form,{error:error||(!kvkk?'Bu form henüz sunucuya bağlı değil; numaranız gönderilmedi.':''),kvkk});
  };
  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    for(const form of root.querySelectorAll<HTMLFormElement>('[data-tc-callback]')){
      const key=form.classList.contains('tc-hero-callback')?'hero':'footer';
      form.dataset.ticartiForm=key;
      const country=form.querySelector<HTMLSelectElement>('select.tc-country-code')?.selectedOptions[0];
      const state=formState[key];
      const visible=form.querySelector('.tc-dial-visible');
      if(visible)visible.textContent=(state?.flag||country?.dataset.flag||'🇹🇷')+' '+(state?.dial||country?.value||'+90');
      const error=form.querySelector<HTMLElement>('.tc-callback-status');
      if(error)error.textContent=state?.error||'';
      const kvkk=form.querySelector<HTMLElement>('.tc-kvkk-error');
      if(kvkk)kvkk.textContent=state?.kvkk||'';
    }
  },[formState]);

  return <div ref={rootRef} onClick={onClick} onChange={onChange} onSubmit={onSubmit}>{children}</div>;
}
