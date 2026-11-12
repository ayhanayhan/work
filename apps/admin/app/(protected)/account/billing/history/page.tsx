'use client';
import {Container} from '@/components/common/container';import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';import {AccountHistoryContent} from './content';
export default function Page(){return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">Fatura & Ödeme Geçmişi</h1><ToolbarDescription>Paket ödemeleri, faturalar ve platform satın alımları.</ToolbarDescription></ToolbarHeading></Toolbar></Container><Container><AccountHistoryContent/></Container></>}
