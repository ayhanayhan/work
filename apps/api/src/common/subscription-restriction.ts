import {PrismaService} from '../prisma/prisma.service';
export type PeriodRules={warningDays:number;graceDays:number;retentionDays:number};
export type RestrictionSettings={trialDays:number;trial:PeriodRules;paid:PeriodRules;emailWarnings:boolean;retentionWarnings:boolean;deletionRequiresApproval:boolean};
export const DEFAULT_RESTRICTION_SETTINGS:RestrictionSettings={trialDays:14,trial:{warningDays:7,graceDays:0,retentionDays:14},paid:{warningDays:30,graceDays:0,retentionDays:45},emailWarnings:true,retentionWarnings:true,deletionRequiresApproval:true};
const DAY=86400000;
export function validateRestrictionSettings(raw:any):RestrictionSettings{
if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Geçersiz kısıtlama ayarları');
const num=(x:any,k:string,min=0,max=3650)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw Error(k+': geçersiz gün değeri');return x as number};
const rule=(k:'trial'|'paid'):PeriodRules=>({warningDays:num(raw[k]?.warningDays,k+'.warningDays'),graceDays:num(raw[k]?.graceDays,k+'.graceDays'),retentionDays:num(raw[k]?.retentionDays,k+'.retentionDays',1)});
for(const k of ['emailWarnings','retentionWarnings','deletionRequiresApproval'])if(typeof raw[k]!=='boolean')throw Error(k+': geçersiz seçenek');
return {trialDays:num(raw.trialDays,'trialDays',1,365),trial:rule('trial'),paid:rule('paid'),emailWarnings:raw.emailWarnings,retentionWarnings:raw.retentionWarnings,deletionRequiresApproval:raw.deletionRequiresApproval};
}
export function calculateRestriction(input:{tenantStatus?:string|null;subscriptionStatus?:string|null;trialEndsAt?:Date|string|null;currentPeriodEnd?:Date|string|null;now?:Date},settings:RestrictionSettings){
const trial=input.subscriptionStatus==='TRIAL'||(!input.subscriptionStatus&&input.tenantStatus==='TRIAL');
const kind=trial?'trial':'paid';const rules=settings[kind];const expiry=trial?input.trialEndsAt:input.currentPeriodEnd;
const end=expiry?new Date(expiry).getTime():NaN;const now=(input.now||new Date()).getTime();
const manual=['SUSPENDED','CANCELLED'].includes(input.tenantStatus||'');const other=input.subscriptionStatus==='CANCELLED';
const hasDate=Number.isFinite(end);const effectiveEnd=hasDate?new Date(end+rules.graceDays*DAY).toISOString():null;
const recoveryEnd=hasDate?new Date(end+(rules.graceDays+rules.retentionDays)*DAY).toISOString():null;
const expired=hasDate&&now>=end+rules.graceDays*DAY;
return {restricted:manual||other||expired,reason:manual?'manual':other?'cancelled':expired?'expired':hasDate?'active':'unknown',kind,warning:hasDate&&now>=end-rules.warningDays*DAY&&!expired,daysRemaining:hasDate?Math.max(0,Math.ceil((end-now)/DAY)):null,graceActive:hasDate&&now>=end&&now<end+rules.graceDays*DAY,effectiveEnd,recoveryEnd};
}
export async function readRestrictionSettings(prisma:PrismaService):Promise<RestrictionSettings>{
const row=await prisma.control().platformSetting.findUnique({where:{key:'subscription_restrictions'}});
if(!row)return DEFAULT_RESTRICTION_SETTINGS;return validateRestrictionSettings(row.value);
}
export async function tenantRestriction(prisma:PrismaService,tenantId:string){
const db=prisma.control();const [tenant,subscription,settings]=await Promise.all([
db.tenant.findUnique({where:{id:tenantId},select:{status:true,trialEndsAt:true}}),
db.subscription.findFirst({where:{tenantId},orderBy:{createdAt:'desc'},select:{status:true,trialEndsAt:true,currentPeriodEnd:true}}),
readRestrictionSettings(prisma)]);
if(!tenant)throw Error('Mağaza bulunamadı');
return {...calculateRestriction({tenantStatus:tenant.status,subscriptionStatus:subscription?.status,trialEndsAt:subscription?.trialEndsAt||tenant.trialEndsAt,currentPeriodEnd:subscription?.currentPeriodEnd},settings),settings};
}