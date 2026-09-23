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
    const items=(section.block_order||Object.keys(bs)).map((bid:string)=>blockToItem(bid,bs[bid]));
    const s=section.settings||{};
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
    themeId:'ticarti',
    themePackageId:'ticarti',
    themeName:'Ticarti',
    themeSourceVersion:'ticarti-source-v1',
    bodyFont:'Inter',
    headingFont:'Roboto',
    baseFontSize:16,
    headingScale:100,
    primaryColor:'#304ffe',
    secondaryColor:'#727b85',
    textColor:'#000000',
    headingColor:'#000000',
    linkColor:'#304ffe',
    backgroundColor:'#ffffff',
    surfaceColor:'#f0f0f0',
    borderColor:'#d9d9d9',
    containerWidth:1600,
    pagePadding:20,
    gridSpacing:20,
    sectionSpacing:100,
    borderRadius:20,
    buttonRadius:8,
    inputRadius:8,
    badgeRadius:8,
    customCss:'',
  },
  header:{template:1,sticky:true,topbarEnabled:false,topbarText:'',topbarLink:''},
  footer:{template:1,copyright:'© {{year}} {{store_name}}. All Rights Reserved',upperHtml:''},
  products:{categoryTemplate:1,productPageTemplate:1,productCardTemplate:1,columnsDesktop:4,columnsTablet:3,columnsMobile:2},
};
