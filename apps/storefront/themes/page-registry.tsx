'use client';

import {useStorefrontTheme} from '../components/StorefrontThemeContext';
import {getThemeModule} from './registry';
import NativeHome from './ticarti/pages/HomePage';
import NativeCollection from './ticarti/pages/CollectionPage';
import NativeProduct from './ticarti/pages/ProductPage';
import NativeCart from './ticarti/pages/CartPage';
import NativeBlog from './ticarti/pages/BlogPage';
import NativeArticle from './ticarti/pages/ArticlePage';
import NativeContent from './ticarti/pages/ContentPage';
import NativeAccount from './ticarti/pages/AccountPage';
import NativeWishlist from './ticarti/pages/WishlistPage';
import NativeCompare from './ticarti/pages/ComparePage';

function useThemePages(){
  const {boot,design}=useStorefrontTheme();
  return getThemeModule({boot,design}).pages;
}

export function ThemeHomePage(){const C=useThemePages().home||NativeHome;return <C/>}
export function ThemeCollectionPage(){const C=useThemePages().collection||NativeCollection;return <C/>}
export function ThemeProductPage(){const C=useThemePages().product||NativeProduct;return <C/>}
export function ThemeCartPage(){const C=useThemePages().cart||NativeCart;return <C/>}
export function ThemeBlogPage(){const C=useThemePages().blog||NativeBlog;return <C/>}
export function ThemeArticlePage(){const C=useThemePages().article||NativeArticle;return <C/>}
export function ThemeContentPage(props:{slug:string;locale?:string;page?:any}){const C=useThemePages().content||NativeContent;return <C {...props}/>}
export function ThemeAccountPage(){const C=useThemePages().account||NativeAccount;return <C/>}
export function ThemeWishlistPage(){const C=useThemePages().wishlist||NativeWishlist;return <C/>}
export function ThemeComparePage(){const C=useThemePages().compare||NativeCompare;return <C/>}
