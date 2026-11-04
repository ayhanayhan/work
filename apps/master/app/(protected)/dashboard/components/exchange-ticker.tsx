'use client';

const rates=[
  ['USD/TRY','43,21','+0,18%'],
  ['EUR/TRY','50,72','+0,09%'],
  ['GBP/TRY','58,12','-0,06%'],
  ['EUR/USD','1,174','-0,03%'],
  ['XAU/TRY','5.386,40','+0,31%'],
];

export function ExchangeTicker(){
  const items=[...rates,...rates];
  return <div className="overflow-hidden border-y bg-muted/30">
    <div className="ticker-track flex w-max items-center py-2.5">
      {items.map(([name,value,change],i)=><div key={`${name}-${i}`} className="flex items-center gap-2 px-6 border-e whitespace-nowrap text-xs"><span className="font-semibold text-mono">{name}</span><span className="font-medium">{value}</span><span className={change.startsWith('+')?'text-success':'text-destructive'}>{change}</span></div>)}
    </div>
    <style jsx>{`@keyframes tickerMove{from{transform:translateX(0)}to{transform:translateX(-50%)}}.ticker-track{animation:tickerMove 28s linear infinite}.ticker-track:hover{animation-play-state:paused}@media (prefers-reduced-motion:reduce){.ticker-track{animation:none}}`}</style>
  </div>;
}
