import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'crypto';
export class ShippingCredentialCrypto{
 private key(){const s=process.env.SHIPPING_ENCRYPTION_KEY||process.env.INTEGRATION_ENCRYPTION_KEY||process.env.JWT_SECRET||'development-only-key';return createHash('sha256').update(s).digest()}
 encrypt(v:any){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key(),iv);const data=Buffer.concat([c.update(JSON.stringify(v||{}),'utf8'),c.final()]);return{ciphertext:data.toString('base64'),iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64')}}
 decrypt(ciphertext:string,iv:string,tag:string){const d=createDecipheriv('aes-256-gcm',this.key(),Buffer.from(iv,'base64'));d.setAuthTag(Buffer.from(tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(ciphertext,'base64')),d.final()]).toString('utf8')||'{}')}
}
