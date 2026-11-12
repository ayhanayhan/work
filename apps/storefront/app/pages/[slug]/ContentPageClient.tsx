'use client';
import {ThemeContentPage} from '../../../themes/page-registry';
export default function ContentPageClient({slug,locale,page}:{slug:string;locale?:string;page?:any}){return <ThemeContentPage slug={slug} locale={locale} page={page}/>;}
