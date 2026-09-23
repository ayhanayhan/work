'use client';

import {useEffect,useMemo,useState} from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode
} from 'libphonenumber-js';
import {currentUiLocale,uiText} from '../lib/i18n';

type Props={
  required?:boolean;
  country?:string;
  locale?:string;
  defaultValue?:string;
  onChange?:(value:string,valid:boolean,countryCode:string)=>void;
};

function normalizeCountry(value?:string):CountryCode{
  const code=String(value||'TR').toUpperCase();
  return (getCountries().includes(code as CountryCode)?code:'TR') as CountryCode;
}

function flagEmoji(code:string){
  return String(code||'').toUpperCase().replace(/[A-Z]/g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));
}

export default function PhoneField({required=true,country='TR',locale='tr-TR',defaultValue='',onChange}:Props){
  const initialCountry=normalizeCountry(country);
  const initial=useMemo(()=>{
    if(!defaultValue)return {country:initialCountry,value:''};
    try{
      const parsed=parsePhoneNumberFromString(defaultValue);
      if(parsed)return {country:(parsed.country||initialCountry) as CountryCode,value:parsed.formatNational()};
    }catch{}
    return {country:initialCountry,value:defaultValue};
  },[]);

  const[phoneCountry,setPhoneCountry]=useState<CountryCode>(initial.country);
  const[value,setValue]=useState(initial.value);
  const[touched,setTouched]=useState(false);

  const displayNames=useMemo(()=>{
    try{return new Intl.DisplayNames([locale||'tr-TR'],{type:'region'})}
    catch{return null}
  },[locale]);

  const countries=useMemo(()=>getCountries().map(code=>({
    code,
    name:displayNames?.of(code)||code,
    callingCode:getCountryCallingCode(code),
    flag:flagEmoji(code)
  })).sort((a,b)=>a.name.localeCompare(b.name,locale||'tr-TR')),[displayNames,locale]);

  function parsed(raw:string,c:CountryCode){
    try{
      return raw.trim().startsWith('+')?parsePhoneNumberFromString(raw.trim()):parsePhoneNumberFromString(raw.trim(),c);
    }catch{return undefined}
  }

  function emit(raw:string,c:CountryCode){
    const clean=raw.trim();
    if(!clean){onChange?.('',!required,c);return !required}
    const p=parsed(clean,c);
    const valid=!!p?.isValid();
    onChange?.(valid&&p?p.number:clean,valid,c);
    return valid;
  }

  const valid=value.trim()?!!parsed(value,phoneCountry)?.isValid():!required;
  const showError=touched&&((required&&!value.trim())||(!!value.trim()&&!valid));

  useEffect(()=>{
    const next=normalizeCountry(country);
    if(!value.trim()){
      setPhoneCountry(next);
      onChange?.('',!required,next);
    }
  },[country]);

  useEffect(()=>{emit(value,phoneCountry)},[]);

  function changeCountry(next:string){
    const code=normalizeCountry(next);
    setPhoneCountry(code);
    setTouched(false);
    emit(value,code);
  }

  function changePhone(raw:string){setValue(raw);emit(raw,phoneCountry)}

  return <label className={`phone-field full ${showError?'has-error':''}`}>
    <span className="phone-floating-label">
      {uiText('checkout.contact.phone',currentUiLocale())}{required?<b className="required-mark"> *</b>:null}
    </span>
    <div className="phone-field-shell">
      <div className="phone-country-control">
        <span className="phone-flag" aria-hidden="true">{flagEmoji(phoneCountry)}</span>
        <select className="phone-country-select" value={phoneCountry} onChange={e=>changeCountry(e.target.value)} aria-label={uiText('checkout.contact.phone',currentUiLocale())}>
          {countries.map(item=><option key={item.code} value={item.code}>{item.flag} {item.name} (+{item.callingCode})</option>)}
        </select>
        <span className="phone-dial-code">+{getCountryCallingCode(phoneCountry)}</span>
      </div>
      <input className="phone-number-input" type="tel" inputMode="tel" autoComplete="tel" value={value} onChange={e=>changePhone(e.target.value)} onBlur={()=>setTouched(true)} placeholder=" " required={required} aria-invalid={showError}/>
    </div>
    <small className="phone-required-help">{uiText('checkout.contact.phoneRequiredHelp',currentUiLocale())}</small>
    {showError&&<small className="phone-field-error">{value.trim()?uiText('checkout.errors.phoneInvalid',currentUiLocale()):uiText('checkout.errors.phoneRequired',currentUiLocale())}</small>}
  </label>;
}
