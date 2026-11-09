import {BadRequestException} from '@nestjs/common';

const SVG_LIMIT=2*1024*1024;
/**
 * Treat SVG uploads as untrusted XML source documents. We never store or
 * publicly serve this source: after checks the image is rasterized through
 * Sharp/librsvg into inert WebP. Restrict external-resource features to avoid
 * SSRF / local file access while decoding.
 */
export function validateSvgForRasterization(buffer:Buffer):Buffer{
 if(!Buffer.isBuffer(buffer)||buffer.length===0||buffer.length>SVG_LIMIT)
  throw new BadRequestException('SVG logo en fazla 2 MB olabilir.');
 let xml:string;
 try{xml=new TextDecoder('utf-8',{fatal:true}).decode(buffer).replace(/^\uFEFF/,'').trim();}
 catch{throw new BadRequestException('SVG dosyası UTF-8 olmalıdır.');}
 if(!/^<svg(?:\s|>)/i.test(xml)||!/<\/svg\s*>$/i.test(xml))
  throw new BadRequestException('Geçerli bir SVG belgesi yükleyin.');
 // DTDs, entities, processing instructions and dangerous elements are forbidden.
 if(/<!|<\?|<\/?\s*(?:script|foreignObject|iframe|object|embed|image|video|audio|animate\w*|set|feImage|a)\b/i.test(xml))
  throw new BadRequestException('SVG içinde etkin içerik, dış kaynak veya XML bildirimi bulunamaz.');
 // No external href, including file:, data:, network, or protocol-relative URLs.
 // Restrict to basic shapes and gradients; referenced images and <use> are
 // deliberately disallowed for a conservative logo ingestion policy.
 if(/\b(?:href|xlink:href|src|srcset|on[a-z]+)\s*=/i.test(xml))
  throw new BadRequestException('SVG bağlantı ve olay işleyicisi içeremez.');
 // CSS imports and url references can load resources during SVG decoding.
 if(/@(?:import|font-face)|url\s*\(\s*(?!['"]?#)[^)]*\)|expression\s*\(|(?:https?:|file:|ftp:|data:|javascript:|\\\\)/i.test(xml))
  throw new BadRequestException('SVG harici kaynak veya gömülü içerik içeremez.');
 // Limit known SVG root namespace to prevent masquerading XML documents.
 const open=xml.match(/^<svg\b([^>]*)>/i)?.[1]||'';
 const xmlns=open.match(/\bxmlns\s*=\s*(['"])(.*?)\1/i)?.[2];
 if(xmlns&&xmlns!=='http://www.w3.org/2000/svg')
  throw new BadRequestException('SVG namespace geçersiz.');
 return Buffer.from(xml,'utf8');
}
