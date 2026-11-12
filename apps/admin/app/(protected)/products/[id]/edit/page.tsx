'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/common/container';
import { ProductEditorPageForm } from '../../components/product-editor-page';
import {AdminExtensionHost} from '@/components/extensions/AdminExtensionHost';

export default function EditProductPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);
  const router=useRouter();
  return <Container><ProductEditorPageForm mode="edit" productId={id} onClose={()=>router.push('/products')}/><div className="mt-5"><AdminExtensionHost target="admin.product.detail.block" context={{productId:id}}/></div></Container>;
}
