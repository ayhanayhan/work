'use client';
import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle } from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { BlogAuthorsTable } from '../components/blog-tables';
export default function Page(){const{settings}=useSettings();return <Fragment>{settings?.layout==='demo1'&&<Container><Toolbar><ToolbarHeading><ToolbarPageTitle/><ToolbarDescription>Blog yazarlarını ve yazar profillerini yönetin.</ToolbarDescription></ToolbarHeading></Toolbar></Container>}<Container><BlogAuthorsTable/></Container></Fragment>}
