'use client';
import {useStorefrontTheme} from '../../components/StorefrontThemeContext';
import ThemeGroupRenderer from './ThemeGroupRenderer';
import LegacyThemeLayoutRenderer from './LegacyThemeLayoutRenderer';

type LayoutType='header'|'footer';
export default function ThemeLayoutRenderer({type,boot}:{type:LayoutType;boot:any}){
  const state=useStorefrontTheme();
  const group=state.runtime?.groups?.[type];
  return group?<ThemeGroupRenderer type={type} boot={boot}/>:<LegacyThemeLayoutRenderer type={type} boot={boot}/>;
}
