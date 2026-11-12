'use client';
import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle } from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { BlogCategoriesTable } from '../components/blog-tables';
export default function Page(){const{settings}=useSettings();return <Fragment>{settings?.layout==='demo1'&&<Container><Toolbar><ToolbarHeading><ToolbarPageTitle/><ToolbarDescription>Blog kategorilerini ve SEO bilgilerini yönetin.</ToolbarDescription></ToolbarHeading></Toolbar></Container>}<Container><BlogCategoriesTable/></Container></Fragment>}
