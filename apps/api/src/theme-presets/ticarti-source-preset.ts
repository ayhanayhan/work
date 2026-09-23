import {getTicartiSkinPreset,normalizeTicartiSkinSlug,ticartiSkinCatalog,TICARTI_DEFAULT_SKIN} from './ticarti-skins';

type AnyMap=Record<string,any>;

export function ticartiSourceHomePreset(skinValue:any=TICARTI_DEFAULT_SKIN){
  const skin=getTicartiSkinPreset(skinValue);
  return (skin.homePreset||[]).map((x:any,i:number)=>({
    sourceId:String(x.sourceId||`${skin.slug}-${i}`),
    sectionType:String(x.sectionType||'rich_text'),
    sortOrder:Number(x.sortOrder??i),
    enabled:x.enabled!==false,
    settings:{...(x.settings||{}),__sourceId:String(x.sourceId||`${skin.slug}-${i}`)},
  }));
}

export function ticartiSourceDesignForSkin(skinValue:any=TICARTI_DEFAULT_SKIN):AnyMap{
  const skin=getTicartiSkinPreset(skinValue);
  const d:any=skin.design||{};
  return {
    general:{...(d.general||{}),themeId:'ticarti',themePackageId:'ticarti',themeName:String(d.general?.themeName||'Ticarti'),themeSourceVersion:'ticarti-skins-v2',skinSlug:skin.slug,skin:skin.slug,skinName:skin.name},
    header:{...(d.header||{})},footer:{...(d.footer||{})},products:{...(d.products||{})}
  };
}

export const ticartiSourceDesign:AnyMap=ticartiSourceDesignForSkin(TICARTI_DEFAULT_SKIN);
export {normalizeTicartiSkinSlug,ticartiSkinCatalog,TICARTI_DEFAULT_SKIN};
