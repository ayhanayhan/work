import { PrismaClient } from '@prisma/client';
import { TURKEY_DISTRICTS } from './data/turkey-districts';

const prisma = new PrismaClient();

function normalizeName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '');
}

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const provinces = await prisma.geoNode.findMany({
    where: { countryCode: 'TR', level: 'ADMIN1', isActive: true },
    select: { id: true, name: true, code: true },
  });

  const provinceMap = new Map(provinces.map((p) => [normalizeName(p.name), p]));
  const sourceProvinceNames = [...new Set(TURKEY_DISTRICTS.map((x) => x.province))];
  const missing = sourceProvinceNames.filter((name) => !provinceMap.has(normalizeName(name)));

  if (missing.length) {
    throw new Error(`Türkiye ADMIN1 eşleşmesi bulunamayan iller: ${missing.join(', ')}`);
  }

  let processed = 0;
  const batchSize = 75;

  for (let offset = 0; offset < TURKEY_DISTRICTS.length; offset += batchSize) {
    const batch = TURKEY_DISTRICTS.slice(offset, offset + batchSize);
    await prisma.$transaction(
      batch.map((row, index) => {
        const parent = provinceMap.get(normalizeName(row.province))!;
        const key = `TR:ADMIN2:OC:${row.sourceId}`;
        const slug = slugify(row.name);
        const sortOrder = row.sortOrder || offset + index + 1;
        const metadata = {
          source: 'opencart-seuty_db',
          openCartCityId: row.sourceId,
          openCartZoneId: row.sourceZoneId,
          openCartZoneCode: row.provinceSourceCode,
          postalCode: row.postalCode,
        };

        return prisma.geoNode.upsert({
          where: { key },
          update: {
            parentId: parent.id,
            level: 'ADMIN2',
            countryCode: 'TR',
            code: row.postalCode || null,
            name: row.name,
            slug,
            sortOrder,
            isActive: true,
            metadata,
          },
          create: {
            key,
            parentId: parent.id,
            level: 'ADMIN2',
            countryCode: 'TR',
            code: row.postalCode || null,
            name: row.name,
            slug,
            sortOrder,
            isActive: true,
            metadata,
          },
        });
      }),
    );
    processed += batch.length;
    console.log(`[geo-tr] ${processed}/${TURKEY_DISTRICTS.length} ilçe işlendi`);
  }

  const activeCount = await prisma.geoNode.count({
    where: { countryCode: 'TR', level: 'ADMIN2', isActive: true },
  });

  console.log(`[geo-tr] tamamlandı. Kaynak: ${TURKEY_DISTRICTS.length}, aktif ADMIN2: ${activeCount}`);
}

main()
  .catch((error) => {
    console.error('[geo-tr] import başarısız', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
