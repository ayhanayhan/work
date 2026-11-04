'use client';
import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarDescription, ToolbarHeading, ToolbarPageTitle } from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { ReviewsTable } from '../components/content-tables';
export default function ContentReviewsPage(){const{settings}=useSettings();return <Fragment>{settings?.layout==='demo1'&&<Container><Toolbar><ToolbarHeading><ToolbarPageTitle/><ToolbarDescription>Moderasyon, doğrulanmış satın alma, puanlama ve mağaza yanıtlarını tek ekrandan yönetin.</ToolbarDescription></ToolbarHeading></Toolbar></Container>}<Container><ReviewsTable/></Container></Fragment>}
