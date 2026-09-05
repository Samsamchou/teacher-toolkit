import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export async function verifyPin(pin,record){
  if(typeof pin!=='string'||!/^\d{6}$/.test(pin))return false;
  const [version,salt,hex]=record.split(':');
  if(version!=='scrypt-v1'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{64}$/.test(hex||''))throw new Error('Invalid passcode secret configuration');
  const actual=await scrypt(pin,salt,32);return timingSafeEqual(actual,Buffer.from(hex,'hex'));
}
export function nextLimit(value,now,windowMs,limit){
  const fresh=!value||now-value.startedAt>=windowMs;
  const next=fresh?{startedAt:now,count:1}:{startedAt:value.startedAt,count:value.count+1};
  return {allowed:next.count<=limit,next};
}
