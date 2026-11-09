import type {Metadata} from 'next';
import RegisterWizard from '../register-wizard';
export const metadata:Metadata={title:'Siteni oluştur | Ticarti',description:'Ticarti hesabını oluştur, mağaza adresini seç.',robots:{index:false,follow:false}};
export default function Page(){return <RegisterWizard/>}
