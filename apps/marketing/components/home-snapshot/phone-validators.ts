const rules:Record<string,RegExp>={
TR:/^5\d{9}$/,US:/^[2-9]\d{2}[2-9]\d{6}$/,CA:/^[2-9]\d{2}[2-9]\d{6}$/,
GB:/^[1-9]\d{9}$/,DE:/^[1-9]\d{5,12}$/,FR:/^[1-9]\d{8}$/,NL:/^[1-9]\d{8}$/,
BE:/^[1-9]\d{7,8}$/,AT:/^[1-9]\d{3,12}$/,CH:/^[1-9]\d{8}$/,
IT:/^\d{6,11}$/,ES:/^[6-9]\d{8}$/,PT:/^[29]\d{8}$/,BG:/^[1-9]\d{7,8}$/,
RO:/^[1-9]\d{8}$/,GR:/^[1269]\d{9}$/,CY:/^[2-9]\d{7}$/,AZ:/^[1-9]\d{8}$/,
GE:/^[1-9]\d{8}$/,UA:/^[1-9]\d{8}$/,RU:/^[3489]\d{9}$/,AE:/^[1-9]\d{7,8}$/,
SA:/^[1-9]\d{8}$/,QA:/^[3-7]\d{7}$/,KW:/^[1-9]\d{7}$/,IQ:/^[1-9]\d{7,9}$/,
IR:/^[1-9]\d{9}$/,EG:/^[1-9]\d{8,9}$/,MA:/^[1-9]\d{8}$/,IN:/^[6-9]\d{9}$/,
PK:/^3\d{9}$/,AU:/^[1-9]\d{8}$};
export function validatePhone(value:string,iso:string,dial:string){
 const raw=value.trim();if(!raw)return 'Telefon numaranızı girin.';
 let v=raw.startsWith(dial)?raw.slice(dial.length).trim():raw;
 if(!/^[0-9 ()-]+$/.test(v)||(v.match(/\(/g)||[]).length!==(v.match(/\)/g)||[]).length)
  return 'Yalnızca rakam, boşluk, kısa çizgi ve parantez kullanın.';
 let digits=v.replace(/\D/g,'');if(iso!=='IT'&&digits.startsWith('0'))digits=digits.slice(1);
 if(!rules[iso]?.test(digits)||!/^\+[1-9]\d{7,14}$/.test(dial+digits))
  return 'Seçilen ülkeye uygun geçerli bir telefon numarası girin.';
 return '';
}
