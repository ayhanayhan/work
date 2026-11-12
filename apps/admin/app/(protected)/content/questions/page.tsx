'use client';
import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle } from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { QuestionsTable } from '../components/content-tables';
export default function ContentQuestionsPage(){const{settings}=useSettings();return <Fragment>{settings?.layout==='demo1'&&<Container><Toolbar><ToolbarHeading><ToolbarPageTitle/><ToolbarDescription>Ürün ve sipariş sorularını tek kuyrukta yönetin ve modal üzerinden cevaplayın.</ToolbarDescription></ToolbarHeading></Toolbar></Container>}<Container><QuestionsTable/></Container></Fragment>}
