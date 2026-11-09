/**
 * EAN-13/GTIN-13 renderer. A valid symbol does not assign GS1 ownership.
 * Encoding: 95 modules, left parity selected by leading digit, Mod-10 check digit.
 */
const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PARITY=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
export function ean13CheckDigit(first12:string):string{
 if(!/^\d{12}$/.test(first12))throw Error('EAN-13 needs twelve digits');
 const sum=[...first12].reduce((total,digit,index)=>total+Number(digit)*(index%2===0?1:3),0);
 return String((10-sum%10)%10);
}
export function completeEan13(input:string):string{
 if(!/^\d{12}(\d)?$/.test(input))throw Error('EAN-13 must be 12 or 13 digits');
 const valid=input.slice(0,12)+ean13CheckDigit(input.slice(0,12));
 if(input.length===13&&input!==valid)throw Error('EAN-13 check digit mismatch');
 return valid;
}
export function ean13Bits(input:string):string{
 const digits=completeEan13(input);
 let bits='101';
 for(let i=1;i<=6;i++){
  const digit=Number(digits[i]);
  bits+=PARITY[Number(digits[0])][i-1]==='L'?L[digit]:G[digit];
 }
 bits+='01010';
 for(let i=7;i<13;i++)bits+=R[Number(digits[i])];
 bits+='101';
 return bits;
}
export function ean13Svg(input:string):string{
 const digits=completeEan13(input),bits=ean13Bits(digits);
 // 11-module quiet zones, 2px per module, 80px high symbol + HRI digits.
 const unit=2,left=22,width=(95+22)*unit;
 const paths:string[]=[];
 for(let i=0;i<bits.length;i++)if(bits[i]==='1'){
  const guard=i<3||(i>=45&&i<50)||i>=92;
  paths.push('<rect x="'+(left+i*unit)+'" y="12" width="'+unit+'" height="'+(guard?82:72)+'"/>');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="116" viewBox="0 0 '+width+' 116" role="img" aria-label="EAN-13 '+digits+'">'+
  '<rect width="100%" height="100%" fill="#fff"/><g fill="#111">'+paths.join('')+'</g>'+
  '<g font-family="Arial,sans-serif" font-size="13" fill="#111" text-anchor="middle">'+
  '<text x="12" y="107">'+digits[0]+'</text>'+
  [...digits.slice(1,7)].map((d,i)=>'<text x="'+(left+(3+i*7+3.5)*unit)+'" y="107">'+d+'</text>').join('')+
  [...digits.slice(7)].map((d,i)=>'<text x="'+(left+(50+i*7+3.5)*unit)+'" y="107">'+d+'</text>').join('')+
  '</g></svg>';
}
