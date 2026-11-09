import assert from 'node:assert/strict';
import sharp = require('sharp');
import {convertPlatformMediaBuffer} from '../src/superadmin/platform-media.service';
import {validateSvgForRasterization} from '../src/media/svg-upload';

async function main(){
  for(const format of ['jpeg','png','webp'] as const){
    const input=await sharp({create:{width:32,height:24,channels:3,background:'#82b237'}})[format]().toBuffer();
    const result=await convertPlatformMediaBuffer(input);
    const metadata=await sharp(result).metadata();
    assert.equal(metadata.format,'webp',format+' must be converted to WebP');
    assert.equal(metadata.width,32);
    assert.equal(metadata.height,24);
  }
  const clean=Buffer.from('<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30" width="100" height="30"><rect width="100" height="30" fill="#0a0"/><circle cx="15" cy="15" r="9" fill="white"/></svg>');
  const svg=validateSvgForRasterization(clean);
  const safeWebp=await convertPlatformMediaBuffer(svg,'image/svg+xml');
  const svgMeta=await sharp(safeWebp).metadata();
  assert.equal(svgMeta.format,'webp','SVG must be served as inert WebP, not XML');
  assert.ok(svgMeta.width&&svgMeta.height);
  const malicious=[
   '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
   '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0"/></svg>',
   '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x.png"/></svg>',
   '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(file:///etc/passwd)"/></svg>',
   '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg/>'
  ];
  for(const bad of malicious){
   assert.throws(()=>validateSvgForRasterization(Buffer.from(bad)),undefined,'Unsafe SVG must be rejected');
  }
  assert.throws(()=>validateSvgForRasterization(Buffer.alloc(2*1024*1024+1)),undefined,'Oversized SVG must be rejected');
  console.log('PASS: platform JPEG/PNG/WebP and validated SVG -> WebP; unsafe SVG rejected');
}
main().catch(err=>{console.error(err);process.exitCode=1});
