import Categories from '../../../components/app-marketplace/categories';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{category:string}>}){
 const {category}=await params;
 return <Categories initialCategory={category}/>;
}
