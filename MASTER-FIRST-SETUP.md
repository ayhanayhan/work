# Ticarti Master — İlk Kurulum

Yeni App Hosting backend adı: `commerce-master`
Uygulama kökü: `apps/master`
Önerilen bölge: `europe-west4`
Custom domain: `master.ticarti.com`

## İlk kez backend oluşturma

```bash
firebase apphosting:backends:create --project wedidit-64fae --location europe-west4
```

Sihirbazda:
- backend adı: `commerce-master`
- root directory: `apps/master`

Backend bir kez oluşturulduktan sonra normal deploy:

```bash
./DEPLOY-MASTER-FIRST.sh
```

## Custom domain

Firebase Console > Hosting & Serverless > App Hosting > commerce-master > Settings > Add custom domain
alanından `master.ticarti.com` eklenir. Firebase'in gösterdiği DNS kayıtları domain DNS yönetimine girilir.

Eski `commerce-superadmin` backend bu geçiş fazında silinmez.
