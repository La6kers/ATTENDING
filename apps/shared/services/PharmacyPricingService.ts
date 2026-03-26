// ============================================================
// ATTENDING AI — Pharmacy Pricing Service
// apps/shared/services/PharmacyPricingService.ts
//
// Core service for medication cost comparison across pharmacies.
// Integrates with GoodRx API (primary) with DB fallback.
// Caches prices in PharmacyPrice table (7-day TTL).
// ============================================================

import { MEDICATION_CATALOG } from '../catalogs/medications';

// ============================================================
// Types
// ============================================================

export interface PharmacyPriceResult {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyChain: string | null;
  pharmacyAddress: string;
  pharmacyPhone: string;
  price: number;
  source: string;
  lastVerified: string;
  distance?: number;
}

export interface MedicationPriceQuery {
  medicationName: string;
  strength: string;
  form: string;
  quantity: number;
  zipCode?: string;
}

export interface MedicationCostItem {
  name: string;
  genericName: string;
  strength: string;
  form: string;
  quantity: number;
  averageRetailPrice: number;
  lowestPrice: number;
  savings: number;
  savingsPercent: number;
  cheapestPharmacy: string;
  pharmacyPrices: PharmacyPriceResult[];
}

export interface MedicationCostSummary {
  totalMonthlyEstimate: number;
  totalLowestCost: number;
  totalSavings: number;
  medicationCount: number;
  medications: MedicationCostItem[];
}

// ============================================================
// GoodRx API Client
// ============================================================

const GOODRX_API_URL = 'https://api.goodrx.com/low-price';
const CACHE_TTL_DAYS = 7;

interface GoodRxPriceResult {
  pharmacy: string;
  price: number;
  url?: string;
}

interface GoodRxApiResponse {
  success: boolean;
  data: {
    prices: Array<{
      pharmacy: string;
      price: string | number;
      type: string;
    }>;
  };
}

async function fetchGoodRxPrices(
  name: string,
  dosage: string,
  quantity: number,
  form: string
): Promise<GoodRxPriceResult[] | null> {
  const apiKey = process.env.GOODRX_API_KEY;
  const apiSecret = process.env.GOODRX_API_SECRET;

  if (!apiKey || !apiSecret) return null;

  try {
    const params = new URLSearchParams({
      name: name.toLowerCase(),
      dosage,
      quantity: String(quantity),
      form: form.toLowerCase(),
      api_key: apiKey,
    });

    const response = await fetch(`${GOODRX_API_URL}?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data: GoodRxApiResponse = await response.json();
    if (!data.success || !data.data?.prices) return null;

    return data.data.prices.map((p) => ({
      pharmacy: p.pharmacy,
      price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
    }));
  } catch {
    return null;
  }
}

// ============================================================
// Catalog Fallback
// ============================================================

function getCatalogPrice(medicationName: string): { generic: number; brand: number } | null {
  const normalized = medicationName.toLowerCase().replace(/\s+/g, '');
  const entry = MEDICATION_CATALOG[normalized];
  if (entry?.cost) return entry.cost;

  // Try matching by generic name
  for (const med of Object.values(MEDICATION_CATALOG)) {
    if (med.genericName.toLowerCase() === medicationName.toLowerCase()) {
      return med.cost;
    }
  }
  return null;
}

// ============================================================
// Main Service
// ============================================================

// Lazy Prisma import — only loaded when DB methods are called
let prisma: any = null;

function getPrisma() {
  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client');
      prisma = new PrismaClient();
    } catch {
      return null;
    }
  }
  return prisma;
}

export async function getPharmacyPrices(
  query: MedicationPriceQuery
): Promise<PharmacyPriceResult[]> {
  const { medicationName, strength, form, quantity, zipCode } = query;

  // 1. Try GoodRx API
  const goodRxResults = await fetchGoodRxPrices(medicationName, strength, quantity, form);
  if (goodRxResults && goodRxResults.length > 0) {
    // Cache results in DB
    await cacheGoodRxPrices(medicationName, strength, form, quantity, goodRxResults);

    return goodRxResults.map((r, i) => ({
      pharmacyId: `goodrx_${r.pharmacy.toLowerCase().replace(/\s+/g, '_')}`,
      pharmacyName: r.pharmacy,
      pharmacyChain: r.pharmacy,
      pharmacyAddress: '',
      pharmacyPhone: '',
      price: r.price,
      source: 'goodrx_api',
      lastVerified: new Date().toISOString(),
    }));
  }

  // 2. Try DB cache
  const db = getPrisma();
  if (db) {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - CACHE_TTL_DAYS);

    const where: any = {
      medicationName: { equals: medicationName, mode: 'insensitive' },
      strength,
      form: { equals: form, mode: 'insensitive' },
      quantity,
      lastVerified: { gte: staleDate },
      pharmacy: { isActive: true },
    };

    if (zipCode) {
      where.pharmacy.zipCode = zipCode;
    }

    try {
      const dbPrices = await db.pharmacyPrice.findMany({
        where,
        include: { pharmacy: true },
        orderBy: { cashPrice: 'asc' },
      });

      if (dbPrices.length > 0) {
        return dbPrices.map((p: any) => ({
          pharmacyId: p.pharmacy.id,
          pharmacyName: p.pharmacy.name,
          pharmacyChain: p.pharmacy.chain,
          pharmacyAddress: `${p.pharmacy.address}, ${p.pharmacy.city}, ${p.pharmacy.state} ${p.pharmacy.zipCode}`,
          pharmacyPhone: p.pharmacy.phone,
          price: p.cashPrice,
          source: p.source,
          lastVerified: p.lastVerified.toISOString(),
        }));
      }
    } catch {
      // DB unavailable — fall through to catalog
    }
  }

  // 3. Catalog fallback — generate estimated prices across pharmacy tiers
  const catalogPrice = getCatalogPrice(medicationName);
  if (!catalogPrice) return [];

  const basePrice = catalogPrice.generic;

  // Pharmacy tier pricing model based on real-world data:
  // Costco/Amazon ~20% below average, Walmart ~15% below, CVS/Walgreens ~10% above
  return [
    { pharmacyId: 'costco', pharmacyName: 'Costco Pharmacy', pharmacyChain: 'Costco', pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 0.80), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'amazon', pharmacyName: 'Amazon Pharmacy', pharmacyChain: 'Amazon', pharmacyAddress: 'Mail Order', pharmacyPhone: '', price: round(basePrice * 0.82), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'walmart', pharmacyName: 'Walmart Pharmacy', pharmacyChain: 'Walmart', pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 0.85), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'sams', pharmacyName: "Sam's Club Pharmacy", pharmacyChain: "Sam's Club", pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 0.83), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'kroger', pharmacyName: 'Kroger Pharmacy', pharmacyChain: 'Kroger', pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 0.92), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'cvs', pharmacyName: 'CVS Pharmacy', pharmacyChain: 'CVS', pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 1.10), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'walgreens', pharmacyName: 'Walgreens', pharmacyChain: 'Walgreens', pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 1.12), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
    { pharmacyId: 'riteaid', pharmacyName: 'Rite Aid', pharmacyChain: 'Rite Aid', pharmacyAddress: '', pharmacyPhone: '', price: round(basePrice * 1.08), source: 'catalog_estimate', lastVerified: new Date().toISOString() },
  ].sort((a, b) => a.price - b.price);
}

export async function getMedicationCostSummary(
  medications: Array<{ name: string; genericName?: string; dose?: string; frequency?: string }>
): Promise<MedicationCostSummary> {
  const results: MedicationCostItem[] = [];

  for (const med of medications) {
    // Parse strength and quantity from dose/frequency
    const strength = med.dose ?? '30mg';
    const quantity = parseQuantityFromFrequency(med.frequency ?? 'once daily');

    const prices = await getPharmacyPrices({
      medicationName: med.genericName ?? med.name,
      strength,
      form: 'tablet',
      quantity,
    });

    if (prices.length === 0) continue;

    const avgPrice = prices.reduce((s, p) => s + p.price, 0) / prices.length;
    const lowestPrice = prices[0].price;

    results.push({
      name: med.name,
      genericName: med.genericName ?? med.name,
      strength,
      form: 'tablet',
      quantity,
      averageRetailPrice: round(avgPrice),
      lowestPrice,
      savings: round(avgPrice - lowestPrice),
      savingsPercent: round(((avgPrice - lowestPrice) / avgPrice) * 100),
      cheapestPharmacy: prices[0].pharmacyName,
      pharmacyPrices: prices,
    });
  }

  const totalMonthly = results.reduce((s, m) => s + m.averageRetailPrice, 0);
  const totalLowest = results.reduce((s, m) => s + m.lowestPrice, 0);

  return {
    totalMonthlyEstimate: round(totalMonthly),
    totalLowestCost: round(totalLowest),
    totalSavings: round(totalMonthly - totalLowest),
    medicationCount: results.length,
    medications: results,
  };
}

export async function findCheapestPharmacy(
  query: MedicationPriceQuery
): Promise<PharmacyPriceResult | null> {
  const prices = await getPharmacyPrices(query);
  return prices.length > 0 ? prices[0] : null;
}

// ============================================================
// Helpers
// ============================================================

async function cacheGoodRxPrices(
  medicationName: string,
  strength: string,
  form: string,
  quantity: number,
  results: GoodRxPriceResult[]
): Promise<void> {
  const db = getPrisma();
  if (!db) return;

  try {
    for (const result of results) {
      const chainName = result.pharmacy;

      // Find or create pharmacy
      let pharmacy = await db.pharmacy.findFirst({
        where: { chain: chainName, isActive: true },
      });

      if (!pharmacy) {
        pharmacy = await db.pharmacy.create({
          data: {
            name: `${chainName} Pharmacy`,
            chain: chainName,
            address: '',
            city: '',
            state: '',
            zipCode: '',
            phone: '',
          },
        });
      }

      // Upsert price
      await db.pharmacyPrice.upsert({
        where: {
          pharmacyId_medicationName_strength_form_quantity: {
            pharmacyId: pharmacy.id,
            medicationName,
            strength,
            form,
            quantity,
          },
        },
        create: {
          pharmacyId: pharmacy.id,
          medicationName,
          strength,
          form,
          quantity,
          cashPrice: result.price,
          source: 'goodrx_api',
          lastVerified: new Date(),
        },
        update: {
          cashPrice: result.price,
          source: 'goodrx_api',
          lastVerified: new Date(),
        },
      });
    }
  } catch {
    // Caching failure is non-critical
  }
}

function parseQuantityFromFrequency(frequency: string): number {
  const freq = frequency.toLowerCase();
  if (freq.includes('twice') || freq.includes('bid') || freq.includes('2')) return 60;
  if (freq.includes('three') || freq.includes('tid') || freq.includes('3')) return 90;
  if (freq.includes('four') || freq.includes('qid') || freq.includes('4')) return 120;
  return 30; // default once daily × 30 days
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
