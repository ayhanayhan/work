'use client';

import { useRouter } from 'next/navigation';
import { Container } from '@/components/common/container';
import { ProductEditorPageForm } from '../components/product-editor-page';

export default function NewProductPage(){
  const router=useRouter();
  return <Container><ProductEditorPageForm mode="new" onClose={()=>router.push('/products')}/></Container>;
}
