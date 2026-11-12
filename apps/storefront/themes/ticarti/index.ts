import ThemeShell from './ThemeShell';
import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import BlogPage from './pages/BlogPage';
import ArticlePage from './pages/ArticlePage';
import ContentPage from './pages/ContentPage';
import AccountPage from './pages/AccountPage';
import WishlistPage from './pages/WishlistPage';
import ComparePage from './pages/ComparePage';
import {manifest} from './manifest';
import type {ThemeModule} from '../contracts/theme-contract';

export const themeId=manifest.id;
export const defaultThemeName=manifest.name;
export {manifest,ThemeShell};
export {default as ThemeHead} from './layout/ThemeHead';

export const themeModule:ThemeModule={
  manifest,
  Shell:ThemeShell,
  pages:{
    home:HomePage,
    collection:CollectionPage,
    product:ProductPage,
    cart:CartPage,
    blog:BlogPage,
    article:ArticlePage,
    content:ContentPage,
    account:AccountPage,
    wishlist:WishlistPage,
    compare:ComparePage,
  },
};
