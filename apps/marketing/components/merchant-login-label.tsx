'use client';
import {useEffect,useState} from 'react';

/** Read-only indicator. Store selection, access tokens and support permissions
 * always remain in the existing merchant login/admin apps. */
export default function MerchantLoginLabel({locale='tr'}:{locale?:string}){
 const [authenticated,setAuthenticated]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('https://login.ticarti.com/session-status',{
   method:'GET',credentials:'include',cache:'no-store',signal:controller.signal
  }).then(async response=>{
   if(!response.ok)return;
   const data=await response.json();
   if(!controller.signal.aborted)setAuthenticated(data?.authenticated===true);
  }).catch(()=>{});
  return ()=>controller.abort();
 },[]);
 const labels:Record<string,[string,string]>={
  tr:['Giriş yap','Mağazama git'],en:['Sign in','My store'],
  de:['Anmelden','Mein Shop'],ru:['Войти','Мой магазин'],
  ar:['تسجيل الدخول','متجري'],bg:['Вход','Моят магазин'],
  uk:['Увійти','Мій магазин'],id:['Masuk','Toko saya'],
  vi:['Đăng nhập','Cửa hàng của tôi']
 };
 const pair=labels[locale]||labels.tr;
 return <>{authenticated?pair[1]:pair[0]}</>;
}
