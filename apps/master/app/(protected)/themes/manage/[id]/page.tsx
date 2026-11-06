import ThemeManagementEditor from '@/app/(protected)/catalog/components/theme-management-editor';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <ThemeManagementEditor themeId={id}/>;
}
