'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AsYouType,getCountries,getCountryCallingCode,parsePhoneNumberFromString,validatePhoneNumberLength} from 'libphonenumber-js/min';
import type {CountryCode} from 'libphonenumber-js';

type Props={
  name?:string;
  label?:string;
  required?:boolean;
  country?:string;
  locale?:string;
  defaultValue?:string;
  onChange?:(value:string,valid:boolean,country:CountryCode)=>void;
};

type FlagMeta={x:number;w:number;h:number};
const FLAG_META:Record<string,FlagMeta>={
  AC:{x:0,w:20,h:10},
  AD:{x:-22,w:20,h:14},
  AE:{x:-44,w:20,h:10},
  AF:{x:-66,w:20,h:14},
  AG:{x:-88,w:20,h:14},
  AI:{x:-110,w:20,h:10},
  AL:{x:-132,w:20,h:15},
  AM:{x:-154,w:20,h:10},
  AO:{x:-176,w:20,h:14},
  AQ:{x:-198,w:20,h:14},
  AR:{x:-220,w:20,h:13},
  AS:{x:-242,w:20,h:10},
  AT:{x:-264,w:20,h:14},
  AU:{x:-286,w:20,h:10},
  AW:{x:-308,w:20,h:14},
  AX:{x:-330,w:20,h:13},
  AZ:{x:-352,w:20,h:10},
  BA:{x:-374,w:20,h:10},
  BB:{x:-396,w:20,h:14},
  BD:{x:-418,w:20,h:12},
  BE:{x:-440,w:20,h:15},
  BF:{x:-460,w:20,h:14},
  BG:{x:-482,w:20,h:12},
  BH:{x:-504,w:20,h:12},
  BI:{x:-526,w:20,h:12},
  BJ:{x:-548,w:20,h:14},
  BL:{x:-570,w:20,h:14},
  BM:{x:-592,w:20,h:10},
  BN:{x:-614,w:20,h:10},
  BO:{x:-636,w:20,h:14},
  BQ:{x:-658,w:20,h:14},
  BR:{x:-680,w:20,h:14},
  BS:{x:-702,w:20,h:10},
  BT:{x:-724,w:20,h:14},
  BV:{x:-746,w:20,h:15},
  BW:{x:-768,w:20,h:14},
  BY:{x:-790,w:20,h:10},
  BZ:{x:-812,w:20,h:14},
  CA:{x:-834,w:20,h:10},
  CC:{x:-856,w:20,h:10},
  CD:{x:-878,w:20,h:15},
  CF:{x:-900,w:20,h:14},
  CG:{x:-922,w:20,h:14},
  CH:{x:-944,w:20,h:15},
  CI:{x:-961,w:20,h:14},
  CK:{x:-983,w:20,h:10},
  CL:{x:-1005,w:20,h:14},
  CM:{x:-1027,w:20,h:14},
  CN:{x:-1049,w:20,h:14},
  CO:{x:-1071,w:20,h:14},
  CP:{x:-1093,w:20,h:14},
  CR:{x:-1115,w:20,h:12},
  CU:{x:-1137,w:20,h:10},
  CV:{x:-1159,w:20,h:12},
  CW:{x:-1181,w:20,h:14},
  CX:{x:-1203,w:20,h:10},
  CY:{x:-1225,w:20,h:14},
  CZ:{x:-1247,w:20,h:14},
  DE:{x:-1269,w:20,h:12},
  DG:{x:-1291,w:20,h:10},
  DJ:{x:-1313,w:20,h:14},
  DK:{x:-1335,w:20,h:15},
  DM:{x:-1357,w:20,h:10},
  DO:{x:-1379,w:20,h:14},
  DZ:{x:-1401,w:20,h:14},
  EA:{x:-1423,w:20,h:14},
  EC:{x:-1445,w:20,h:14},
  EE:{x:-1467,w:20,h:13},
  EG:{x:-1489,w:20,h:14},
  EH:{x:-1511,w:20,h:10},
  ER:{x:-1533,w:20,h:10},
  ES:{x:-1555,w:20,h:14},
  ET:{x:-1577,w:20,h:10},
  EU:{x:-1599,w:20,h:14},
  FI:{x:-1621,w:20,h:12},
  FJ:{x:-1643,w:20,h:10},
  FK:{x:-1665,w:20,h:10},
  FM:{x:-1687,w:20,h:11},
  FO:{x:-1709,w:20,h:15},
  FR:{x:-1731,w:20,h:14},
  GA:{x:-1753,w:20,h:15},
  GB:{x:-1775,w:20,h:10},
  GD:{x:-1797,w:20,h:12},
  GE:{x:-1819,w:20,h:14},
  GF:{x:-1841,w:20,h:14},
  GG:{x:-1863,w:20,h:14},
  GH:{x:-1885,w:20,h:14},
  GI:{x:-1907,w:20,h:10},
  GL:{x:-1929,w:20,h:14},
  GM:{x:-1951,w:20,h:14},
  GN:{x:-1973,w:20,h:14},
  GP:{x:-1995,w:20,h:14},
  GQ:{x:-2017,w:20,h:14},
  GR:{x:-2039,w:20,h:14},
  GS:{x:-2061,w:20,h:10},
  GT:{x:-2083,w:20,h:13},
  GU:{x:-2105,w:20,h:11},
  GW:{x:-2127,w:20,h:10},
  GY:{x:-2149,w:20,h:12},
  HK:{x:-2171,w:20,h:14},
  HM:{x:-2193,w:20,h:10},
  HN:{x:-2215,w:20,h:10},
  HR:{x:-2237,w:20,h:10},
  HT:{x:-2259,w:20,h:12},
  HU:{x:-2281,w:20,h:10},
  IC:{x:-2303,w:20,h:14},
  ID:{x:-2325,w:20,h:14},
  IE:{x:-2347,w:20,h:10},
  IL:{x:-2369,w:20,h:15},
  IM:{x:-2391,w:20,h:10},
  IN:{x:-2413,w:20,h:14},
  IO:{x:-2435,w:20,h:10},
  IQ:{x:-2457,w:20,h:14},
  IR:{x:-2479,w:20,h:12},
  IS:{x:-2501,w:20,h:15},
  IT:{x:-2523,w:20,h:14},
  JE:{x:-2545,w:20,h:12},
  JM:{x:-2567,w:20,h:10},
  JO:{x:-2589,w:20,h:10},
  JP:{x:-2611,w:20,h:14},
  KE:{x:-2633,w:20,h:14},
  KG:{x:-2655,w:20,h:12},
  KH:{x:-2677,w:20,h:13},
  KI:{x:-2699,w:20,h:10},
  KM:{x:-2721,w:20,h:12},
  KN:{x:-2743,w:20,h:14},
  KP:{x:-2765,w:20,h:10},
  KR:{x:-2787,w:20,h:14},
  KW:{x:-2809,w:20,h:10},
  KY:{x:-2831,w:20,h:10},
  KZ:{x:-2853,w:20,h:10},
  LA:{x:-2875,w:20,h:14},
  LB:{x:-2897,w:20,h:14},
  LC:{x:-2919,w:20,h:10},
  LI:{x:-2941,w:20,h:12},
  LK:{x:-2963,w:20,h:10},
  LR:{x:-2985,w:20,h:11},
  LS:{x:-3007,w:20,h:14},
  LT:{x:-3029,w:20,h:12},
  LU:{x:-3051,w:20,h:12},
  LV:{x:-3073,w:20,h:10},
  LY:{x:-3095,w:20,h:10},
  MA:{x:-3117,w:20,h:14},
  MC:{x:-3139,w:20,h:15},
  MD:{x:-3160,w:20,h:10},
  ME:{x:-3182,w:20,h:10},
  MF:{x:-3204,w:20,h:14},
  MG:{x:-3226,w:20,h:14},
  MH:{x:-3248,w:20,h:11},
  MK:{x:-3270,w:20,h:10},
  ML:{x:-3292,w:20,h:14},
  MM:{x:-3314,w:20,h:14},
  MN:{x:-3336,w:20,h:10},
  MO:{x:-3358,w:20,h:14},
  MP:{x:-3380,w:20,h:10},
  MQ:{x:-3402,w:20,h:14},
  MR:{x:-3424,w:20,h:14},
  MS:{x:-3446,w:20,h:10},
  MT:{x:-3468,w:20,h:14},
  MU:{x:-3490,w:20,h:14},
  MV:{x:-3512,w:20,h:14},
  MW:{x:-3534,w:20,h:14},
  MX:{x:-3556,w:20,h:12},
  MY:{x:-3578,w:20,h:10},
  MZ:{x:-3600,w:20,h:14},
  NA:{x:-3622,w:20,h:14},
  NC:{x:-3644,w:20,h:10},
  NE:{x:-3666,w:20,h:15},
  NF:{x:-3686,w:20,h:10},
  NG:{x:-3708,w:20,h:10},
  NI:{x:-3730,w:20,h:12},
  NL:{x:-3752,w:20,h:14},
  NO:{x:-3774,w:20,h:15},
  NP:{x:-3796,w:20,h:15},
  NR:{x:-3811,w:20,h:10},
  NU:{x:-3833,w:20,h:10},
  NZ:{x:-3855,w:20,h:10},
  OM:{x:-3877,w:20,h:10},
  PA:{x:-3899,w:20,h:14},
  PE:{x:-3921,w:20,h:14},
  PF:{x:-3943,w:20,h:14},
  PG:{x:-3965,w:20,h:15},
  PH:{x:-3987,w:20,h:10},
  PK:{x:-4009,w:20,h:14},
  PL:{x:-4031,w:20,h:13},
  PM:{x:-4053,w:20,h:14},
  PN:{x:-4075,w:20,h:10},
  PR:{x:-4097,w:20,h:14},
  PS:{x:-4119,w:20,h:10},
  PT:{x:-4141,w:20,h:14},
  PW:{x:-4163,w:20,h:13},
  PY:{x:-4185,w:20,h:11},
  QA:{x:-4207,w:20,h:8},
  RE:{x:-4229,w:20,h:14},
  RO:{x:-4251,w:20,h:14},
  RS:{x:-4273,w:20,h:14},
  RU:{x:-4295,w:20,h:14},
  RW:{x:-4317,w:20,h:14},
  SA:{x:-4339,w:20,h:14},
  SB:{x:-4361,w:20,h:10},
  SC:{x:-4383,w:20,h:10},
  SD:{x:-4405,w:20,h:10},
  SE:{x:-4427,w:20,h:13},
  SG:{x:-4449,w:20,h:14},
  SH:{x:-4471,w:20,h:10},
  SI:{x:-4493,w:20,h:10},
  SJ:{x:-4515,w:20,h:15},
  SK:{x:-4537,w:20,h:14},
  SL:{x:-4559,w:20,h:14},
  SM:{x:-4581,w:20,h:15},
  SN:{x:-4603,w:20,h:14},
  SO:{x:-4625,w:20,h:14},
  SR:{x:-4647,w:20,h:14},
  SS:{x:-4669,w:20,h:10},
  ST:{x:-4691,w:20,h:10},
  SV:{x:-4713,w:20,h:12},
  SX:{x:-4735,w:20,h:14},
  SY:{x:-4757,w:20,h:14},
  SZ:{x:-4779,w:20,h:14},
  TA:{x:-4801,w:20,h:10},
  TC:{x:-4823,w:20,h:10},
  TD:{x:-4845,w:20,h:14},
  TF:{x:-4867,w:20,h:14},
  TG:{x:-4889,w:20,h:13},
  TH:{x:-4911,w:20,h:14},
  TJ:{x:-4933,w:20,h:10},
  TK:{x:-4955,w:20,h:10},
  TL:{x:-4977,w:20,h:10},
  TM:{x:-4999,w:20,h:14},
  TN:{x:-5021,w:20,h:14},
  TO:{x:-5043,w:20,h:10},
  TR:{x:-5065,w:20,h:14},
  TT:{x:-5087,w:20,h:12},
  TV:{x:-5109,w:20,h:10},
  TW:{x:-5131,w:20,h:14},
  TZ:{x:-5153,w:20,h:14},
  UA:{x:-5175,w:20,h:14},
  UG:{x:-5197,w:20,h:14},
  UM:{x:-5219,w:20,h:11},
  UN:{x:-5241,w:20,h:14},
  US:{x:-5263,w:20,h:11},
  UY:{x:-5285,w:20,h:14},
  UZ:{x:-5307,w:20,h:10},
  VA:{x:-5329,w:20,h:15},
  VC:{x:-5346,w:20,h:14},
  VE:{x:-5368,w:20,h:14},
  VG:{x:-5390,w:20,h:10},
  VI:{x:-5412,w:20,h:14},
  VN:{x:-5434,w:20,h:14},
  VU:{x:-5456,w:20,h:12},
  WF:{x:-5478,w:20,h:14},
  WS:{x:-5500,w:20,h:10},
  XK:{x:-5522,w:20,h:15},
  YE:{x:-5544,w:20,h:14},
  YT:{x:-5566,w:20,h:14},
  ZA:{x:-5588,w:20,h:14},
  ZM:{x:-5610,w:20,h:14},
  ZW:{x:-5632,w:20,h:10}
};

function Flag({country}:{country:CountryCode}){
  const m=FLAG_META[country]||{x:0,w:20,h:15};
  return <span className="phone-flag-sprite" aria-hidden="true" style={{width:m.w,height:m.h,backgroundPosition:`${m.x}px 0px`}}/>;
}

function formatNationalPhone(value:string,country:CountryCode){
  let digits=value.replace(/\D/g,'');
  if(!digits)return '';
  while(digits.length>1&&validatePhoneNumberLength(digits,country)==='TOO_LONG')digits=digits.slice(0,-1);
  try{return new AsYouType(country).input(digits)}catch{return digits}
}

export default function PhoneField({name='phone',label='Telefon',required=true,country='TR',locale='tr-TR',defaultValue='',onChange}:Props){
  const fallback=(getCountries().includes(country as CountryCode)?country:'TR') as CountryCode;
  const parsedDefault=useMemo(()=>{try{return defaultValue?parsePhoneNumberFromString(defaultValue)||null:null}catch{return null}},[defaultValue]);
  const initialCountry=(parsedDefault?.country||fallback) as CountryCode;
  const initialNational=formatNationalPhone(parsedDefault?.nationalNumber||defaultValue.replace(/^\+\d{1,4}\s*/, ''),initialCountry);
  const[selectedCountry,setSelectedCountry]=useState<CountryCode>(initialCountry);
  const[input,setInput]=useState(initialNational);
  const[touched,setTouched]=useState(false);
  const edited=useRef(false);
  const parsed=useMemo(()=>{
    const raw=input.trim();
    if(!raw)return null;
    try{return parsePhoneNumberFromString(raw,selectedCountry)||null}catch{return null}
  },[input,selectedCountry]);
  const valid=!input.trim()? !required : !!parsed?.isValid()&&parsed.country===selectedCountry;
  const e164=valid&&parsed?parsed.number:'';
  const callback=useRef(onChange);
  useEffect(()=>{callback.current=onChange},[onChange]);
  const displayNames=useMemo(()=>new Intl.DisplayNames([locale],{type:'region'}),[locale]);
  const countries=useMemo(()=>getCountries().map(code=>({code,label:displayNames.of(code)||code,dial:getCountryCallingCode(code)})).sort((a,b)=>a.label.localeCompare(b.label,locale)),[displayNames,locale]);
  const selectedDial=getCountryCallingCode(selectedCountry);

  useEffect(()=>{
    edited.current=false;
    try{
      const parsedValue=defaultValue?parsePhoneNumberFromString(defaultValue)||null:null;
      if(parsedValue?.country){setSelectedCountry(parsedValue.country);setInput(formatNationalPhone(parsedValue.nationalNumber,parsedValue.country));setTouched(false);return;}
    }catch{}
    if(getCountries().includes(country as CountryCode))setSelectedCountry(country as CountryCode);
    setInput(formatNationalPhone(defaultValue.replace(/^\+\d{1,4}\s*/,''),(getCountries().includes(country as CountryCode)?country:'TR') as CountryCode));
    setTouched(false);
  },[defaultValue,country]);
  useEffect(()=>{callback.current?.(e164,valid,selectedCountry)},[e164,valid,selectedCountry]);

  return <label className="field full phone-field"><span>{label}</span>
    <div className={`phone-control phone-control-sprite ${touched&&!valid?'invalid':''}`}>
      <div className="phone-country-picker">
        <Flag country={selectedCountry}/>
        <span className="phone-dial-code">+{selectedDial}</span>
        <span className="phone-country-arrow" aria-hidden="true">⌄</span>
        <select aria-label="Ülke telefon kodu" className="phone-country-native" value={selectedCountry} onChange={e=>{const next=e.target.value as CountryCode;edited.current=true;setSelectedCountry(next);setInput(formatNationalPhone(input,next));setTouched(!!input.trim())}}>
          {countries.map(c=><option key={c.code} value={c.code}>{c.label} (+{c.dial})</option>)}
        </select>
      </div>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={input}
        required={required}
        placeholder="Telefon numarası"
        pattern="[0-9 ()\-]+"
        onChange={e=>{edited.current=true;const next=formatNationalPhone(e.target.value,selectedCountry);setInput(next);setTouched(true)}}
        onBlur={()=>setTouched(true)}
        aria-invalid={touched&&!valid}
      />
    </div>
    <input type="hidden" name={name} value={e164}/>
    {touched&&!valid&&<small className="field-error">Numara, seçtiğiniz ülke kodunun telefon formatına uymuyor.</small>}
  </label>;
}
