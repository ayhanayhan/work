'use client';

import { useEffect, useState } from 'react';
import { useMasterSession } from '@/app/components/MasterSession';
import MasterAdminDashboard from '@/app/components/MasterAdminDashboard';
import './dashboard-admin.css';

export default function Dashboard(){
  const{request}=useMasterSession();
  const[data,setData]=useState<any>(null);
  const[error,setError]=useState('');

  useEffect(()=>{
    request('/superadmin/dashboard')
      .then(setData)
      .catch((e:any)=>setError(e.message||'Dashboard yüklenemedi'));
  },[request]);

  if(error)return <div className="commerce-admin-dashboard-clone"><div className="alert alert-danger">{error}</div></div>;
  if(!data)return <div className="commerce-admin-dashboard-clone"><div className="text-muted">Dashboard yükleniyor…</div></div>;

  return <div className="commerce-admin-dashboard-clone"><MasterAdminDashboard data={data}/></div>;
}
