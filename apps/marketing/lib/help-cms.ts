import {HELP_TOPICS,type HelpTopic,helpArticleSlug} from './help-topics';

const API=String(process.env.API_ORIGIN||'').replace(/\/$/,'');
export type HelpArticle=HelpTopic['questions'][number]&{id?:string;slug?:string;enabled?:boolean};
export type HelpCategory=Omit<HelpTopic,'questions'>&{enabled?:boolean;questions:HelpArticle[]};
export async function getHelpTopics():Promise<HelpCategory[]> {
 if(!API)return HELP_TOPICS;
 try{
  const response=await fetch(API+'/v1/public/website/help',{cache:'no-store',signal:AbortSignal.timeout(4500)});
  if(!response.ok)return HELP_TOPICS;
  const data=await response.json();
  if(!Array.isArray(data?.topics))return HELP_TOPICS;
  return data.topics.map((c:any)=>({
   id:String(c.id||''),title:String(c.title||''),summary:String(c.summary||''),
   questions:Array.isArray(c.questions)?c.questions.map((a:any)=>({
    id:String(a.id||''),slug:String(a.slug||helpArticleSlug(String(a.question||''))),
    question:String(a.question||''),answer:String(a.answer||'')
   })):[]
  })).filter((c:HelpCategory)=>c.id&&c.title);
 }catch{return HELP_TOPICS;}
}
export function articleUrl(article:HelpArticle){return 'https://help.ticarti.com/makale/'+(article.slug||helpArticleSlug(article.question));}
export function findHelpArticle(topics:HelpCategory[],slug:string){
 for(const topic of topics){
  const index=topic.questions.findIndex(a=>(a.slug||helpArticleSlug(a.question))===slug);
  if(index>=0)return {topic,article:topic.questions[index],index};
 }
 return null;
}
