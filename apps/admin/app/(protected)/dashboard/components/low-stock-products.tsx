'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type RecordValue = Record<string, any>;
const object = (value: unknown): RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const list = (value: unknown): RecordValue[] => Array.isArray(value) ? value.map(object) : [];
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

function variantLabel(item: RecordValue): string {
  const variant = object(item.variant);
  const selections = object(item.selectedOptions ?? variant.selectedOptions);
  const values = Object.values(selections).map(text).filter(Boolean);
  if (values.length) return values.join(' / ');
  return text(item.variantTitle) || text(item.variantName) ||
    text(variant.title) || text(variant.name) || 'Standart';
}

function imageUrl(item: RecordValue): string {
  const product = object(item.product);
  const variant = object(item.variant);
  const images = list(item.images ?? product.images).sort(
    (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
  );
  const selected = object(item.selectedOptions ?? variant.selectedOptions);
  const imageOption = text(item.variantImageOption) ||
    text(object(item.metadata).variantImageOption) ||
    text(object(product.metadata).variantImageOption);
  const optionValue = text(selected[imageOption]);
  const ids = new Set(
    (Array.isArray(item.mediaIds) ? item.mediaIds : variant.mediaIds ?? [])
      .map((id: unknown) => String(id)),
  );
  // Product editor stores the image associations on each variant as mediaIds.
  // Match the selected image option (e.g. Renk=Mavi) before using the image.
  const match = images.find(img =>
    ids.has(String(img.id)) ||
    ids.has(String(img.mediaAssetId)) ||
    (imageOption && optionValue &&
      (Array.isArray(img.assignedValues) && img.assignedValues.includes(optionValue) ||
       Array.isArray(img.variantSkus) && img.variantSkus.includes(item.sku ?? variant.sku))),
  );
  const resolve = (img: unknown): string => {
    if (typeof img === 'string') return img;
    const obj = object(img);
    return text(obj.url) || text(obj.publicUrl) || text(obj.src);
  };
  // Do not use another colour's image when a variant has an explicit image mapping.
  if (match) return resolve(match);
  if (ids.size > 0 || (imageOption && imageOption !== 'none' && optionValue)) {
    return resolve(item.variantImageUrl) || resolve(variant.image);
  }
  return resolve(item.imageUrl) || resolve(item.image) ||
    resolve(variant.image) || resolve(product.featuredImage) ||
    resolve(images[0]);
}

function ProductThumbnail({ item }: { item: RecordValue }) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(item);
  return (
    <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
      {url && !failed ? (
        <img src={url} alt={text(item.title) || 'Ürün görseli'} loading="lazy"
          onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff aria-label="Ürün görseli bulunamadı" className="size-4" />
        </div>
      )}
    </div>
  );
}

export function LowStockProducts({ data }: { data: any }) {
  const items = Array.isArray(data?.lowStockItems)
    ? data.lowStockItems.filter((item: RecordValue) => Number(item.available ?? 0) <= 0)
    : [];
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" /> Stoğu Biten Ürünler
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.slice(0, 5).map((item: RecordValue, index: number) => (
          <div key={item.variantId || item.id || index} className="flex items-center gap-3">
            <ProductThumbnail item={item} />
            <div className="min-w-0 grow">
              <div className="truncate text-sm font-medium">{item.title || item.product?.title || 'Ürün'}</div>
              <div className="truncate text-xs text-muted-foreground">{variantLabel(item)}</div>
            </div>
            <Badge appearance="light" variant="destructive">0 adet</Badge>
          </div>
        ))}
        {!items.length && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Stoğu biten ürün bulunmuyor.
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button mode="link" underlined="dashed" asChild>
          <Link href="/products/inventory">Stok Yönetimine Git</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
