'use client';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {BlogPostsTable} from '../components/blog-tables';
export default function Page(){return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold text-mono">Blog İçerikleri</h1><ToolbarDescription>Çok dilli blog yazıları, yayın planı, ilişkiler ve SEO.</ToolbarDescription></ToolbarHeading></Toolbar></Container><Container><BlogPostsTable/></Container></>}
