import {helpArticleSlug} from './help-topics';
export function articleUrl(article:{slug?:string;question:string}){
 return 'https://help.ticarti.com/makale/'+(article.slug||helpArticleSlug(article.question));
}
