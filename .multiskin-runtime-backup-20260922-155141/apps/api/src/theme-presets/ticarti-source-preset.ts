import preset from './ticarti-home-preset';

type AnyMap=Record<string,any>;

function blockToItem(id:string,b:any){
  const s=b?.settings||{};
  return {
    id,
    type:b?.type,
    title:s.heading_text||s.title||s.text||'',
    subtitle:s.subheading_text||s.subtitle||'',
    content:s.desc||s.description||'',
    buttonText:s.button_name||s.link_name||'',
    linkUrl:s.url||s.button_url||s.custom_link||'',
    imageUrl:s.image||s.image_url||'',
    videoUrl:s.video_url||'',
    ...s,
  };
}

export function ticartiSourceHomePreset(){
  const p:any=preset;
  return (p.order||[]).map((id:string,index:number)=>{
    const section=p.sections?.[id]||{};
    const bs=section.blocks||{};
    const s=section.settings||{};
    const items=Array.isArray(s.items)&&s.items.length?s.items:(section.block_order||Object.keys(bs)).map((bid:string)=>blockToItem(bid,bs[bid]));
    return {
      sourceId:id,
      sectionType:String(section.type||'rich_text'),
      sortOrder:index,
      enabled:section.disabled!==true,
      settings:{
        ...s,
        __sourceId:id,
        title:s.main_heading||s.heading_text||s.title||'',
        subtitle:s.main_subheading||s.subheading_text||s.subtitle||'',
        content:s.main_desc||s.desc||s.description||'',
        buttonText:s.link_name||s.button_name||'',
        linkUrl:s.url||'',
        heightDesktop:s.desktop_image_height||s.image_height||620,
        count:s.product_limit||s.post_limit||8,
        items,
        __sourceBlocks:bs,
      },
    };
  });
}

export const ticartiSourceDesign:AnyMap={
  general:{
    themeId:'ticarti',themePackageId:'ticarti',themeName:'Ticarti',themeSourceVersion:'ticarti-source-v1',
    bodyFont:'Roboto Flex',headingFont:'Prata',baseFontSize:17.6,headingScale:110,
    primaryColor:'#f48fb1',secondaryColor:'#f48fb1',textColor:'#333333',headingColor:'#333333',linkColor:'#f48fb1',
    backgroundColor:'#ffffff',surfaceColor:'#f2f2f2',borderColor:'#d0d0d0',containerWidth:1400,pagePadding:30,gridSpacing:30,sectionSpacing:80,
    borderRadius:10,buttonRadius:8,inputRadius:8,badgeRadius:4,customCss:'',skin:'18-lingerie-store'
  },
  header:{template:1,sticky:true,topbarEnabled:true,topbarText:'FREE Shipping on All US Orders Over $149',topbarLink:''},
  footer:{template:1,copyright:'© {{year}} {{store_name}}. All Rights Reserved',upperHtml:''},
  products:{categoryTemplate:1,productPageTemplate:1,productCardTemplate:1,columnsDesktop:4,columnsTablet:3,columnsMobile:2,priceSizeDesktop:20,priceSizeMobile:20}
};
