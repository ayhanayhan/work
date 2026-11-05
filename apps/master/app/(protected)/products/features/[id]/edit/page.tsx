'use client';

import { use } from 'react';
import { FeatureEditorPage } from '../../../components/feature-manager';

export default function Page({params}:{params:Promise<{id:string}>}){ const {id}=use(params); return <FeatureEditorPage featureId={id}/>; }
