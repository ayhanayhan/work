import {HeaderMegaTree} from '../navigation-tree';
import type {Navigation} from '../../lib/navigation';
export default function MobileMegaMenu({navigation,locale='tr'}:{navigation:Navigation|null;locale?:string}){
 return <HeaderMegaTree navigation={navigation} locale={locale} mobile/>;
}
