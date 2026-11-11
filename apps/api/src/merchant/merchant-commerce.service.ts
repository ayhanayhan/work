import { Injectable } from '@nestjs/common';
import { MerchantService } from './merchant.service';

type Query = Record<string, string | undefined>;

@Injectable()
export class MerchantCommerceService {
  constructor(private readonly merchant: MerchantService) {}

  private filterActive(value: unknown): boolean {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 && normalized.toUpperCase() !== 'ALL';
  }

  private page(rows: any[], query: Query, summary: Record<string, number>) {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 25;
    return {
      items: rows.slice((page - 1) * limit, page * limit),
      page,
      limit,
      total: rows.length,
      pages: Math.max(1, Math.ceil(rows.length / limit)),
      summary,
    };
  }

  async products(tenantId: string, query: Query) {
    const rows: any[] = await this.merchant.products(tenantId, String(query.storeId ?? ''), query.q);
    const selected = rows.filter(row =>
      (!this.filterActive(query.status) || String(row.status ?? '').toUpperCase() === String(query.status).toUpperCase()) &&
      (!this.filterActive(query.brandId) || String(row.brandId ?? '') === query.brandId) &&
      (!this.filterActive(query.categoryId) || (row.categories ?? []).some((category: any) =>
        String(category.categoryId ?? category.category?.id ?? '') === query.categoryId))
    );
    const summary = {
      total: rows.length,
      active: rows.filter(row => String(row.status ?? '').toUpperCase() === 'ACTIVE').length,
      draft: rows.filter(row => String(row.status ?? '').toUpperCase() === 'DRAFT').length,
      archived: rows.filter(row => String(row.status ?? '').toUpperCase() === 'ARCHIVED').length,
    };
    return this.page(selected, query, summary);
  }

  async orders(tenantId: string, query: Query) {
    const rows: any[] = await this.merchant.orders(tenantId, String(query.storeId ?? ''));
    const search = String(query.q ?? '').trim().toLowerCase();
    const selected = rows.filter(row =>
      (!this.filterActive(query.status) || String(row.status ?? '').toUpperCase() === String(query.status).toUpperCase()) &&
      (!this.filterActive(query.paymentStatus) || String(row.paymentStatus ?? '').toUpperCase() === String(query.paymentStatus).toUpperCase()) &&
      (!this.filterActive(query.fulfillmentStatus) || String(row.fulfillmentStatus ?? '').toUpperCase() === String(query.fulfillmentStatus).toUpperCase()) &&
      (!search || String(row.number ?? '').toLowerCase().includes(search) ||
        String(row.customer?.email ?? '').toLowerCase().includes(search))
    );
    return this.page(selected, query, { total: rows.length });
  }

  async customers(tenantId: string, query: Query) {
    const rows: any[] = await this.merchant.customers(tenantId, String(query.storeId ?? ''), query.q);
    const selected = rows.filter(row =>
      (!this.filterActive(query.groupId) || String(row.groupId ?? '') === query.groupId) &&
      (!this.filterActive(query.status) || String(row.status ?? '').toUpperCase() === String(query.status).toUpperCase())
    );
    return this.page(selected, query, { total: rows.length });
  }
}
