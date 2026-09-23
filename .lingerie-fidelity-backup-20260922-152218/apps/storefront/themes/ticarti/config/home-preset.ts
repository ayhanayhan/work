import preset from './home-preset.json';

function blockToItem(id:string,b:any){
  const s=b?.settings||{};
  return {
    id,
    type:b?.type,
    title:s.heading_text||s.title||s.text||s.brand_name||'',
    text:s.text||s.heading_text||s.title||'',
    subtitle:s.subheading_text||s.subtitle||'',
    content:s.desc||s.description||'',
    buttonText:s.button_name||s.link_name||'',
    linkUrl:s.url||s.button_url||s.custom_link||'',
    imageUrl:s.image||s.image_url||'',
    videoUrl:s.video_url||'',
    productHandle:s.product||'',
    ...s,
  };
}

export function sourceHomePreset(){
  const p:any=preset;
  return (p.order||[]).map((id:string)=>{
    const section=p.sections?.[id]||{};
    const bs=section.blocks||{};
    const items=(section.block_order||Object.keys(bs)).map((bid:string)=>blockToItem(bid,bs[bid]));
    const s=section.settings||{};
    return {
      id,
      sourceId:id,
      sectionType:section.type,
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
        heightMobile:s.mobile_image_height||s.image_height_mobile||560,
        count:s.product_limit||s.post_limit||8,
        items,
      },
      blocks:bs,
    };
  });
}
