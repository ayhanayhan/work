export const nativeShellCss=String.raw`
.ticarti-theme .tn-container{width:min(calc(100% - 40px),var(--page-width,1280px));margin-inline:auto}
.ticarti-theme .tn-header{position:relative;z-index:60;background:#fff;color:var(--color-base,#111);border-bottom:1px solid var(--color-lines,#e7e7e7);font-family:var(--font-body-family,Inter,sans-serif)}
.ticarti-theme .tn-header--sticky{position:sticky;top:0}
.ticarti-theme .tn-header--p6{background:color-mix(in srgb,#fff 82%,transparent);backdrop-filter:blur(14px)}
.ticarti-theme .tn-announcement{padding:8px 20px;text-align:center;font-size:12px;line-height:1.4;background:var(--color-accent,#111);color:#fff}
.ticarti-theme .tn-header__row{min-height:72px;display:flex;align-items:center;gap:26px}
.ticarti-theme .tn-header__grow{flex:1}
.ticarti-theme .tn-header__desktopnav{display:flex;align-items:center}
.ticarti-theme .tn-brand{display:inline-flex;align-items:center;min-width:0;color:inherit;text-decoration:none}
.ticarti-theme .tn-brand__image{display:block;width:auto;max-height:44px;object-fit:contain}
.ticarti-theme .tn-brand__text{font-family:var(--font-heading-family,Inter,sans-serif);font-size:22px;font-weight:700;letter-spacing:-.03em}
.ticarti-theme .tn-nav__list{display:flex;align-items:center;gap:26px;list-style:none;margin:0;padding:0}
.ticarti-theme .tn-nav__item{position:relative}
.ticarti-theme .tn-nav__link{display:flex;align-items:center;gap:3px;padding:25px 0;color:inherit;text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap}
.ticarti-theme .tn-nav__link:hover{opacity:.62}
.ticarti-theme .tn-nav__chevron{width:14px;height:14px;display:inline-flex}.ticarti-theme .tn-nav__chevron svg{width:100%;height:100%;transform:rotate(90deg)}
.ticarti-theme .tn-nav__dropdown{display:none;position:absolute;left:-16px;top:calc(100% - 8px);min-width:210px;padding:10px;background:#fff;border:1px solid var(--color-lines,#e7e7e7);border-radius:12px;box-shadow:0 16px 45px rgba(0,0,0,.1)}
.ticarti-theme .tn-nav__item:hover>.tn-nav__dropdown{display:grid}
.ticarti-theme .tn-nav__dropdown-link{padding:10px 12px;border-radius:8px;color:#111;text-decoration:none;font-size:13px}
.ticarti-theme .tn-nav__dropdown-link:hover{background:#f5f5f5}
.ticarti-theme .tn-nav--mega .tn-nav__dropdown{min-width:300px;grid-template-columns:1fr 1fr}
.ticarti-theme .tn-tools{display:flex;align-items:center;gap:3px}
.ticarti-theme .tn-iconbtn{position:relative;width:40px;height:40px;display:grid;place-items:center;border:0;background:transparent;color:inherit;border-radius:999px;text-decoration:none;cursor:pointer}
.ticarti-theme .tn-iconbtn:hover{background:#f5f5f5}.ticarti-theme .tn-iconbtn svg{width:20px;height:20px}
.ticarti-theme .tn-cartcount{position:absolute;right:1px;top:1px;min-width:17px;height:17px;padding:0 4px;display:grid;place-items:center;border-radius:999px;background:var(--color-accent,#111);color:#fff;font-size:10px;font-weight:700}
.ticarti-theme .tn-select{height:34px;border:1px solid var(--color-lines,#e7e7e7);background:#fff;border-radius:8px;padding:0 8px;font:inherit;font-size:12px;color:inherit}
.ticarti-theme .tn-mobile-toggle{display:none}
.ticarti-theme .tn-header__centered-top{min-height:68px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.ticarti-theme .tn-header__centered-top .tn-tools{justify-self:end}
.ticarti-theme .tn-header__centered-nav{display:flex;justify-content:center;border-top:1px solid var(--color-lines,#e7e7e7)}
.ticarti-theme .tn-header__centered-nav .tn-nav__link{padding:15px 0}
.ticarti-theme .tn-header__stack{padding:0}.ticarti-theme .tn-header__verticalwrap{display:flex;align-items:stretch;border-top:1px solid var(--color-lines,#e7e7e7)}
.ticarti-theme .tn-header__vertical-title{display:flex;align-items:center;min-width:180px;padding:0 18px;background:#111;color:#fff;font-size:13px;font-weight:700}
.ticarti-theme .tn-header__verticalwrap .tn-nav{padding-left:22px}.ticarti-theme .tn-header__verticalwrap .tn-nav__link{padding:16px 0}
.ticarti-theme .tn-searchbar{border-top:1px solid var(--color-lines,#e7e7e7);background:#fff}
.ticarti-theme .tn-searchbar__form{height:64px;display:flex;align-items:center;gap:12px}.ticarti-theme .tn-searchbar__form>svg{width:20px;height:20px}
.ticarti-theme .tn-searchbar__form input{flex:1;border:0;outline:0;font:inherit;font-size:16px;background:transparent}
.ticarti-theme .tn-searchbar__close{width:38px;height:38px;display:grid;place-items:center;border:0;background:transparent;cursor:pointer}.ticarti-theme .tn-searchbar__close svg{width:20px;height:20px}
.ticarti-theme .tn-drawer{position:fixed;inset:0;z-index:100;display:grid;grid-template-columns:min(88vw,380px) 1fr}
.ticarti-theme .tn-drawer__backdrop{grid-column:1/-1;grid-row:1;position:absolute;inset:0;border:0;background:rgba(0,0,0,.42);cursor:pointer}
.ticarti-theme .tn-drawer__panel{position:relative;grid-column:1;grid-row:1;background:#fff;color:#111;min-height:100%;padding:18px;overflow:auto;box-shadow:20px 0 60px rgba(0,0,0,.18)}
.ticarti-theme .tn-drawer__head{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid #e7e7e7}
.ticarti-theme .tn-drawer__nav{display:grid;padding:14px 0}.ticarti-theme .tn-drawer__group{display:grid;border-bottom:1px solid #eee;padding:6px 0}
.ticarti-theme .tn-drawer__group>a{padding:11px 4px;color:inherit;text-decoration:none;font-weight:600}.ticarti-theme .tn-drawer__group>a.tn-drawer__child{padding-left:18px;font-size:13px;font-weight:400;color:#666}

.ticarti-theme .tn-footer{background:#0f0f10;color:#f7f7f7;border-top:1px solid rgba(255,255,255,.08);font-family:var(--font-body-family,Inter,sans-serif)}
.ticarti-theme .tn-footer a{color:inherit;text-decoration:none}.ticarti-theme .tn-footer a:hover{opacity:.68}
.ticarti-theme .tn-footer__grid{display:grid;grid-template-columns:minmax(220px,1.35fr) repeat(3,minmax(130px,1fr));gap:44px;padding:64px 0 48px}
.ticarti-theme .tn-footer--p4 .tn-footer__grid{grid-template-columns:minmax(220px,1.25fr) repeat(4,minmax(120px,1fr))}
.ticarti-theme .tn-footer__brand p{max-width:340px;margin:16px 0 0;color:#a7a7aa;font-size:14px;line-height:1.7}
.ticarti-theme .tn-footer__logo{display:inline-flex;font-family:var(--font-heading-family,Inter,sans-serif);font-size:25px;font-weight:750;letter-spacing:-.03em}.ticarti-theme .tn-footer__logo img{display:block;max-width:170px;max-height:48px;object-fit:contain}
.ticarti-theme .tn-footer__column h3{margin:3px 0 17px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#fff}
.ticarti-theme .tn-footer__column nav{display:grid;gap:11px}.ticarti-theme .tn-footer__column nav a{font-size:14px;color:#b9b9bc}
.ticarti-theme .tn-footer__newsletter{display:grid;grid-template-columns:1fr minmax(320px,.8fr);align-items:end;gap:40px;padding:36px 0;border-top:1px solid rgba(255,255,255,.12)}
.ticarti-theme .tn-footer__newsletter h2{margin:4px 0 7px;font-size:25px;letter-spacing:-.03em}.ticarti-theme .tn-footer__newsletter p{margin:0;color:#a7a7aa;font-size:14px}
.ticarti-theme .tn-footer__eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#8f8f93}
.ticarti-theme .tn-footer__newsletter form{display:flex;gap:8px}.ticarti-theme .tn-footer__newsletter input{flex:1;height:46px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:#18181a;color:#fff;padding:0 14px;outline:0}
.ticarti-theme .tn-footer__newsletter button{height:46px;border:0;border-radius:10px;padding:0 18px;background:#fff;color:#111;font-weight:700;cursor:pointer}
.ticarti-theme .tn-footer__bottom{min-height:74px;display:flex;align-items:center;justify-content:space-between;gap:22px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;color:#8f8f93}
.ticarti-theme .tn-footer__bottom-right,.ticarti-theme .tn-footer__inline{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.ticarti-theme .tn-footer__payments{white-space:nowrap}
.ticarti-theme .tn-footer--p2{padding:24px 0}.ticarti-theme .tn-footer__minimal{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:30px}.ticarti-theme .tn-footer__minimal .tn-footer__inline{justify-content:center}.ticarti-theme .tn-footer__copy{font-size:12px;color:#8f8f93}
.ticarti-theme .tn-footer--p3{padding:52px 0 24px}.ticarti-theme .tn-footer--p3 .tn-footer__newsletter{border-top:0;padding-top:0}.ticarti-theme .tn-footer__lower{display:flex;justify-content:space-between;gap:20px;padding-top:26px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;color:#8f8f93}
.ticarti-theme .tn-footer--p4 .tn-footer__newsletter{border-top:0;border-bottom:1px solid rgba(255,255,255,.12);padding-top:56px}
.ticarti-theme .tn-footer--p5{padding:22px 0}.ticarti-theme .tn-footer__compact{display:flex;align-items:center;gap:28px}.ticarti-theme .tn-footer__compact .tn-footer__inline{margin-left:auto}.ticarti-theme .tn-footer__compact .tn-footer__brand p{display:none}.ticarti-theme .tn-footer__compact .tn-footer__logo{font-size:20px}

@media(max-width:1024px){
 .ticarti-theme .tn-header__desktopnav,.ticarti-theme .tn-header__centered-nav,.ticarti-theme .tn-header__verticalwrap{display:none}
 .ticarti-theme .tn-mobile-toggle{display:grid}
 .ticarti-theme .tn-header__centered-top{grid-template-columns:1fr auto}.ticarti-theme .tn-header__centered-top>.tn-header__spacer{display:none}.ticarti-theme .tn-header__centered-top .tn-brand{justify-self:start}
 .ticarti-theme .tn-footer__grid,.ticarti-theme .tn-footer--p4 .tn-footer__grid{grid-template-columns:1fr 1fr}
}
@media(max-width:720px){
 .ticarti-theme .tn-container{width:min(calc(100% - 28px),var(--page-width,1280px))}
 .ticarti-theme .tn-header__row,.ticarti-theme .tn-header__centered-top{min-height:62px;gap:8px}
 .ticarti-theme .tn-brand__text{font-size:19px}.ticarti-theme .tn-brand__image{max-height:36px}
 .ticarti-theme .tn-tools .tn-select{display:none}.ticarti-theme .tn-iconbtn{width:38px;height:38px}
 .ticarti-theme .tn-tools>a[aria-label="Hesabım"],.ticarti-theme .tn-tools>a[aria-label="Favoriler"]{display:none}
 .ticarti-theme .tn-footer__grid,.ticarti-theme .tn-footer--p4 .tn-footer__grid{grid-template-columns:1fr;gap:28px;padding:46px 0 34px}
 .ticarti-theme .tn-footer__newsletter{grid-template-columns:1fr;gap:22px}
 .ticarti-theme .tn-footer__bottom,.ticarti-theme .tn-footer__lower{align-items:flex-start;flex-direction:column;padding:22px 0}
 .ticarti-theme .tn-footer__minimal{grid-template-columns:1fr;justify-items:start}.ticarti-theme .tn-footer__minimal .tn-footer__inline{justify-content:flex-start}
 .ticarti-theme .tn-footer__compact{align-items:flex-start;flex-direction:column;gap:14px}.ticarti-theme .tn-footer__compact .tn-footer__inline{margin-left:0}
}
`;
