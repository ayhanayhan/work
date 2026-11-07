import assert from 'node:assert/strict';
import sharp = require('sharp');
import {convertPlatformMediaBuffer} from '../src/superadmin/platform-media.service';

async function main(){
  for(const format of ['jpeg','png','webp'] as const){
    const input=await sharp({create:{width:32,height:24,channels:3,background:'#82b237'}})[format]().toBuffer();
    const result=await convertPlatformMediaBuffer(input);
    const metadata=await sharp(result).metadata();
    assert.equal(metadata.format,'webp',format+' must be converted to WebP');
    assert.equal(metadata.width,32);
    assert.equal(metadata.height,24);
  }
  console.log('PASS: real platform media JPEG/PNG/WebP -> WebP conversion');
}
main().catch(err=>{console.error(err);process.exitCode=1});
