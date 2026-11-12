'use client';
import {Container} from '@/components/common/container';import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';import {AccountPlansContent} from './content';
export default function Page(){return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">Paketler</h1><ToolbarDescription>İhtiyacınıza uygun Ticarti paketini ve faturalandırma dönemini seçin.</ToolbarDescription></ToolbarHeading></Toolbar></Container><Container><AccountPlansContent/></Container></>}
