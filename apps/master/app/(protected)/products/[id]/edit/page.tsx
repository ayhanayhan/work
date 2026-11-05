'use client';

import { use } from 'react';
import { PackageEditorPage } from '../../components/package-manager';

export default function Page({params}:{params:Promise<{id:string}>}){ const {id}=use(params); return <PackageEditorPage planId={id}/>; }
