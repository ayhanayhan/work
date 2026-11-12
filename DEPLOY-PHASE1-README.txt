TICARTI PHASE 1 - SUPERADMIN CONTENT + PLANS

Deploy edilen servisler:
1) commerce-api (Cloud Run, europe-west1)
2) commerce-superadmin (Firebase App Hosting)

Bu fazda Prisma migration yoktur.

KULLANIM
-------
1. Arsivi Downloads icinde acin.
2. Terminal:

   cd ~/Downloads/commerce-saas-wedidit-test-runtimefix
   gcloud auth login
   firebase login
   gcloud config set project wedidit-64fae
   ./DEPLOY-PHASE1.sh

Script npm ci, superadmin build kontrolu, API candidate deploy/health/promote ve Superadmin deploy islemlerini sirayla yapar.

Deploy sonrasi:
https://superadmin.ticarti.com/content/home
https://superadmin.ticarti.com/content/login
https://superadmin.ticarti.com/content/register
https://superadmin.ticarti.com/plans
