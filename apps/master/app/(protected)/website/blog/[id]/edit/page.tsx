import WebsiteBlogPostForm from '../../../components/website-blog-post-form';
export default async function EditBlogPostPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  return <WebsiteBlogPostForm postId={id}/>;
}
