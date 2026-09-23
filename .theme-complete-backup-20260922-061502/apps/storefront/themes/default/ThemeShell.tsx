'use client';
import Link from 'next/link';
export default function DefaultThemeShell({boot,children}:{boot:any;design:any;children:React.ReactNode}){const store=boot?.store||{};return <div><header style={{padding:16,borderBottom:'1px solid #ddd',display:'flex',justifyContent:'space-between'}}><Link href="/">{store.name||'Store'}</Link><nav><Link href="/products">Products</Link>{' · '}<Link href="/cart">Cart</Link></nav></header><main>{children}</main><footer style={{padding:16,borderTop:'1px solid #ddd'}}>© {new Date().getFullYear()} {store.name||'Store'}</footer></div>}
