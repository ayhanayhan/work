/* Real original 8 profile cards, kept as typed JSX. No HTML string cloning. */
import type {HomeItem} from '@/lib/home-cms';
import {safeAssetUrl,textFor} from '@/lib/home-cms';
export default function HeroCards({clone=false,items,locale='tr'}:{clone?:boolean;items?:HomeItem[];locale?:string}){
 const configured=(items||[]).filter(item=>item.enabled!==false&&item.assets?.image);
 if(items?.length)return <>{configured.map(item=><article key={item.id} className="tc-ui-card" data-clone={clone?'1':undefined} aria-hidden={clone||undefined}>
   <div className="tc-ui-card__photo">
     <img className="tc-ui-card__img" alt={textFor(item.fields?.heading,locale)||''} src={safeAssetUrl(item.assets?.image,'/assets/images/ticarti-butik-girisimci.webp')}/>
     <div className="tc-ui-card__prev">
       <span className="tc-ui-card__prev-label">{textFor(item.fields?.description,locale)||textFor(item.fields?.heading,locale)}</span>
       {item.assets?.logo?<div className="tc-ui-card__logos"><img className="tc-ui-card__logo" src={safeAssetUrl(item.assets.logo,'')} alt={textFor(item.fields?.heading,locale)||'Logo'}/></div>:null}
     </div>
   </div>
 </article>)}</>;
 return <>

            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"Backend Developer"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Builder%20Hugo.webp"} data-tc-content-src={"image-002"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-062"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Microsoft"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Symbols_7.png"} data-tc-content-src={"image-003"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"Data Scientist"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Images/card-natalia.webp"} data-tc-content-src={"image-004"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-063"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Oracle"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Oracle.png"} data-tc-content-src={"image-005"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"DevOps Engineer"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Builder%20Kit_B.webp"} data-tc-content-src={"image-006"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-064"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Uber"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Symbols_6-1.png"} data-tc-content-src={"image-007"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"Product Designer"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/magnific_cambia-la-iluminacion-y-e_gOJzI5eSXO%201%20(1).webp"} data-tc-content-src={"image-008"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-065"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Coca-Cola"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Cocacola.png"} data-tc-content-src={"image-009"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"Data Engineer"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/magnific_cambia-la-iluminacion-y-e_gOJzI5eSXO%201%20(2).webp"} data-tc-content-src={"image-010"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-066"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Inditex"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Symbols.png"} data-tc-content-src={"image-011"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"AI Solutions Architect"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Builder%20Kit_c.webp"} data-tc-content-src={"image-012"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-067"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Glovo"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Symbols_3.png"} data-tc-content-src={"image-013"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"Mobile Developer"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/magnific_cambia-la-iluminacion-y-e_gOJzI5eSXO%201%20(3).webp"} data-tc-content-src={"image-014"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-068"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"BBVA"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Frame%202147237050.png"} data-tc-content-src={"image-015"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
            <article className={"tc-ui-card"} data-clone={clone?"1":undefined} aria-hidden={clone?true:undefined}>
              {"\n"}
              <div className={"tc-ui-card__photo"}>
                {"\n"}
                <img alt={"Security Engineer"} className={"tc-ui-card__img"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Builder%20Kit%20(1).webp"} data-tc-content-src={"image-016"} />
                {"\n"}
                <div className={"tc-ui-card__prev"}>
                  {"\n"}
                  <span className={"tc-ui-card__prev-label"} data-tc-content-key={"span-069"}>
                    {"Ürünlerini, siparişlerini ve stoklarını tek panelden kolayca yönet."}
                  </span>
                  {"\n"}
                  <div className={"tc-ui-card__logos"}>
                    {"\n"}
                    <img alt={"Spotify"} className={"tc-ui-card__logo"} decoding={"async"} src={"https://www.shakersworks.com/hubfs/Web%20repositioning/Talent%20cards/Imagenes%20para%20cards%20expandibles/Logos/Symbols_5.png"} data-tc-content-src={"image-017"} />
                    {"\n"}
                  </div>
                  {"\n"}
                </div>
                {"\n"}
              </div>
              {"\n"}
            </article>
            {"\n"}
          
</>}
