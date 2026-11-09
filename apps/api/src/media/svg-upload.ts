import {BadRequestException} from '@nestjs/common';

const SVG_LIMIT=2*1024*1024;
/**
 * Treat SVG uploads as untrusted XML. Never store or serve the uploaded XML:
 * validate its allowed subset, then rasterize to WebP using Sharp/librsvg.
 * Reject all network/file references before invoking the image decoder.
 */
export function validateSvgForRasterization(buffer:Buffer):Buffer{
 if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>SVG_LIMIT)
  throw new BadRequestException('SVG logo en fazla 2 MB olabilir.');
 let xml:string;
 try{xml=new TextDecoder('utf-8',{fatal:true}).decode(buffer).replace(/^\uFEFF/,'').trim();}
 catch{throw new BadRequestException('SVG dosyası UTF-8 olmalıdır.');}
 // XML declaration and editor comments are common on genuine exported logos.
 // Strip them instead of forwarding arbitrary processing instructions to librsvg.
 xml=xml.replace(/^<\?xml\s+version\s*=\s*['"]1\.[01]['"][^?]*\?>\s*/i,'');
 xml=xml.replace(/<!--[\s\S]*?-->/g,'').trim();
 if(!/^<svg(?:\s|>)/i.test(xml)||!/<\/svg\s*>$/i.test(xml))
  throw new BadRequestException('Geçerli bir SVG belgesi yükleyin.');
 if(/<!|<\?|<\/?\s*(?:script|foreignObject|iframe|object|embed|image|use|video|audio|animate\w*|set|feImage|a)\b/i.test(xml))
  throw new BadRequestException('SVG içinde etkin içerik veya dış kaynak tanımı bulunamaz.');
 // No event handlers, URI-bearing attributes, or XML Base URL redirects.
 if(/\b(?:href|xlink:href|src|srcset|xml:base|on[a-z]+)\s*=/i.test(xml))
  throw new BadRequestException('SVG harici bağlantı veya olay işleyicisi içeremez.');
 // Only references to local SVG paint servers (#gradients / #clip paths) are allowed.
 const urls=[...xml.matchAll(/url\s*\(\s*([^)]*)\)/gi)];
 if(urls.some(match=>!/^['"]?#[a-zA-Z_][\w.-]*['"]?$/.test(match[1].trim())))
  throw new BadRequestException('SVG dış kaynak yükleyemez.');
 if(/@(?:import|font-face)|expression\s*\(|\\(?:[0-9a-f]{1,6}\s?|[a-z])/i.test(xml))
  throw new BadRequestException('SVG içinde dış kaynak veya kaçış dizisi bulunamaz.');
 const open=xml.match(/^<svg\b([^>]*)>/i)?.[1]||'';
 const xmlns=open.match(/\bxmlns\s*=\s*(['"])(.*?)\1/i)?.[2];
 if(xmlns&&xmlns!=='http://www.w3.org/2000/svg')
  throw new BadRequestException('SVG namespace geçersiz.');
 // Safe, standard XML namespace declarations are allowed, but URLs and schemes
 // anywhere else are rejected. Unknown namespace declarations are unsupported.
 const withoutNamespaces=xml.replace(/\s+xmlns(?::[\w-]+)?\s*=\s*(['"])(.*?)\1/gi,(_all,quote:string,url:string)=>{
  if(!['http://www.w3.org/2000/svg','http://www.w3.org/1999/xlink','http://www.w3.org/XML/1998/namespace'].includes(url))
   throw new BadRequestException('SVG namespace geçersiz.');
  return '';
 });
 if(/(?:https?:|file:|ftp:|data:|javascript:|\/\/|\\\\)/i.test(withoutNamespaces))
  throw new BadRequestException('SVG içinde harici kaynak adresi bulunamaz.');
 return Buffer.from(xml,'utf8');
}
