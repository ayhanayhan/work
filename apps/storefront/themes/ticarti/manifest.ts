import {THEME_CONTRACT_VERSION,type ThemeManifest} from '../contracts/theme-contract';

export const manifest:ThemeManifest={
  id:'ticarti',
  name:'Ticarti',
  version:'1.0.0',
  contractVersion:THEME_CONTRACT_VERSION,
  surface:'storefront',
  entry:'index.ts',
  assetsDir:null,
  capabilities:['sections','settings','menus','custom-css','responsive','rtl'],
};
