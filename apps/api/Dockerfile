FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY nest-cli.json tsconfig.json ./
COPY src ./src
RUN npm run build && test -f dist/main.js && test -f dist/website/data/ticarti-blog-initial.json && node -e "const {assertFaqSeeds}=require('./dist/website/faq-seed.js');assertFaqSeeds(); const {WebsiteService}=require('./dist/website/website.service.js');if(typeof WebsiteService!=='function')throw Error('WebsiteService did not load'); const blog=require('./dist/website/data/ticarti-blog-initial.json');if(blog.articles?.length!==10)throw Error('Blog seed invalid');console.log('FAQ/blog production imports OK')" && node -e "require('./dist/website/website-pages.service.js'); console.log('Website pages module import OK')" \
 && node -e "const sharp=require('sharp'); const {convertPlatformMediaBuffer}=require('./dist/superadmin/platform-media.service.js'); sharp({create:{width:8,height:8,channels:3,background:'#82b237'}}).jpeg().toBuffer().then(convertPlatformMediaBuffer).then(b=>sharp(b).metadata()).then(m=>{if(m.format!=='webp')throw Error('Not WebP');console.log('Platform JPEG -> WebP runtime OK')}).catch(e=>{console.error(e);process.exit(1)})"

COPY docker-entrypoint.sh db-init.sh ./
RUN chmod +x ./docker-entrypoint.sh ./db-init.sh

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
