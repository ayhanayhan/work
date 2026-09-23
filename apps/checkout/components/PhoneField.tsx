'use client';
import {currentUiLocale,uiText} from '../lib/i18n';

import {useEffect,useMemo,useState} from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode
} from 'libphonenumber-js';

type Props={
  required?:boolean;
  country?:string;
  locale?:string;
  defaultValue?:string;
  onChange?:(value:string,valid:boolean,countryCode:string)=>void;
};

export default function PhoneField({
  required=true,
  country='TR',
  locale='tr-TR',
  defaultValue='',
  onChange
}:Props){
  const normalizeCountry=(value?:string):CountryCode=>{
    const code=String(value||'TR').toUpperCase();
    return (getCountries().includes(code as CountryCode)?code:'TR') as CountryCode;
  };

  const initialCountry=normalizeCountry(country);

  const initial=useMemo(()=>{
    if(!defaultValue)return {country:initialCountry,value:''};

    try{
      const parsed=parsePhoneNumberFromString(defaultValue);
      if(parsed){
        return {
          country:(parsed.country||initialCountry) as CountryCode,
          value:parsed.formatNational()
        };
      }
    }catch{}

    return {country:initialCountry,value:defaultValue};
  },[]);

  const[phoneCountry,setPhoneCountry]=useState<CountryCode>(initial.country);
  const[value,setValue]=useState(initial.value);
  const[touched,setTouched]=useState(false);

  const displayNames=useMemo(()=>{
    try{
      return new Intl.DisplayNames([locale||'tr-TR'],{type:'region'});
    }catch{
      return null;
    }
  },[locale]);

  const countries=useMemo(()=>{
    return getCountries()
      .map(code=>({
        code,
        name:displayNames?.of(code)||code,
        callingCode:getCountryCallingCode(code)
      }))
      .sort((a,b)=>a.name.localeCompare(b.name,locale||'tr-TR'));
  },[displayNames,locale]);

  const validate=(raw:string,c:CountryCode)=>{
    const clean=raw.trim();

    if(!clean){
      onChange?.('',!required,c);
      return false;
    }

    try{
      const parsed=clean.startsWith('+')
        ? parsePhoneNumberFromString(clean)
        : parsePhoneNumberFromString(clean,c);

      const valid=!!parsed?.isValid();

      onChange?.(
        valid&&parsed ? parsed.number : clean,
        valid,
        c
      );

      return valid;
    }catch{
      onChange?.(clean,false,c);
      return false;
    }
  };

  const valid=value.trim()?validateSilently(value,phoneCountry):!required;

  function validateSilently(raw:string,c:CountryCode){
    try{
      const parsed=raw.trim().startsWith('+')
        ? parsePhoneNumberFromString(raw.trim())
        : parsePhoneNumberFromString(raw.trim(),c);

      return !!parsed?.isValid();
    }catch{
      return false;
    }
  }

  useEffect(()=>{
    const next=normalizeCountry(country);

    if(!value.trim()){
      setPhoneCountry(next);
      onChange?.('',!required,next);
    }
  },[country]);

  useEffect(()=>{
    validate(value,phoneCountry);
  },[]);

  function changeCountry(next:string){
    const code=normalizeCountry(next);
    setPhoneCountry(code);
    setTouched(false);
    validate(value,code);
  }

  function changePhone(raw:string){
    setValue(raw);
    validate(raw,phoneCountry);
  }

  const showError=touched&&(
    required&&!value.trim() ||
    !!value.trim()&&!valid
  );

  return (
    <label className={`phone-field full ${showError?'has-error':''}`}>
      <span>
        Telefon{required&&<b className="required-mark"> *</b>}
      </span>

      <div className="phone-field-row">
        <select
          className="phone-country-select"
          value={phoneCountry}
          onChange={e=>changeCountry(e.target.value)}
          aria-label="Telefon ülke kodu"
        >
          {countries.map(item=>(
            <option key={item.code} value={item.code}>
              {item.name} (+{item.callingCode})
            </option>
          ))}
        </select>

        <input
          className="phone-number-input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={e=>changePhone(e.target.value)}
          onBlur={()=>setTouched(true)}
          placeholder="Telefon numarası"
          required={required}
          aria-invalid={showError}
        />
      </div>

      {showError&&(
        <small className="phone-field-error">
          {value.trim()
            ? '{uiText('checkout.errors.phoneInvalid',currentUiLocale())}'
            : 'Telefon numarası zorunludur.'}
        </small>
      )}
    </label>
  );
}
