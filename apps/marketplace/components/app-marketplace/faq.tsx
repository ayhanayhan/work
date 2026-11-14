const entries=[
 ['Ticarti Uygulama Mağazası nedir?','Ticarti mağazanızı geliştirmek için kargo, ödeme, muhasebe, pazarlama ve diğer uygulamaları keşfedebileceğiniz uygulama kataloğudur.'],
 ['Mağazama nasıl uygulama yükleyebilirim?','Uygulamanın detay sayfasını açın, Ticarti hesabınızla giriş yapın ve mağazanızı seçerek yükleme adımlarını takip edin.'],
 ['Uygulamalar ücretsiz mi?','Ücretsiz uygulamalar katalogda Ücretsiz etiketiyle gösterilir. Ücretli uygulamaların fiyatını ve ücretlendirme bilgilerini detay sayfasından inceleyebilirsiniz.'],
 ['Yüklediğim uygulamaları nereden yönetebilirim?','Ticarti mağazanızın yönetim panelindeki uygulama yönetimi bölümünden yüklü uygulamalarınıza ve ayarlarına ulaşabilirsiniz.'],
 ['Bir uygulamayla ilgili nasıl destek alabilirim?','Uygulama bilgilerini detay sayfasından inceleyebilir, ek yardım için Ticarti Yardım Merkezi’ne başvurabilirsiniz.'],
 ['Ticarti için uygulama geliştirebilir miyim?','Geliştirici portalından Ticarti ile uygulama geliştirme ve entegrasyon seçeneklerini inceleyebilirsiniz.']
];
export default function MarketplaceFaq(){
 return <section className="tc-faq" id="tc-faq">
 <div className="tc-faq__inner">
  <div className="tc-faq__intro"><h2 className="tc-faq__title">Sık sorulan sorular</h2><p className="tc-faq__subtitle">Ticarti uygulamaları hakkında merak ettikleriniz.</p><a className="tc-faq__button" href="https://help.ticarti.com/">Yardım Merkezi</a></div>
  <div className="tc-faq__list">{entries.map(([question,answer],i)=><div key={i} className={'tc-faq__item'+(i===0?' is-open':'')}>
   <button className="tc-faq__question" id={'tc-faq-head-'+i} aria-controls={'tc-faq-panel-'+i} aria-expanded={i===0} type="button"><span className="tc-faq__q-text">{question}</span><span aria-hidden="true" className="tc-faq__icon"><svg fill="none" height={20} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" width={20}><polyline points="6 9 12 15 18 9"/></svg></span></button>
   <div aria-labelledby={'tc-faq-head-'+i} className="tc-faq__panel" id={'tc-faq-panel-'+i} role="region"><div className="tc-faq__answer"><p>{answer}</p></div></div>
  </div>)}</div>
 </div>
 </section>;
}
