'use client';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {PagesTable} from '../components/content-tables';
export default function ContentPagesPage(){return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Sayfalar</h1><ToolbarDescription>Mağaza içerik sayfalarını ve çok dilli yayınlarını yönetin.</ToolbarDescription></ToolbarHeading></Toolbar></Container><Container><PagesTable/></Container></>}
