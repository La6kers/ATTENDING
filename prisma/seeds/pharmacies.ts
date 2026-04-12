// ============================================================
// ATTENDING AI — Pharmacy & Pricing Seed Data
// prisma/seeds/pharmacies.ts
//
// Seeds pharmacy chains and representative medication pricing.
// Pricing reflects real-world cash price variation across chains.
//
// Run: npx ts-node prisma/seeds/pharmacies.ts
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// Pharmacy Chains
// ============================================================

const PHARMACIES = [
  { name: 'CVS Pharmacy', chain: 'CVS', address: '100 Main St', city: 'St. Louis', state: 'MO', zipCode: '63101', phone: '(314) 555-0101', priceMultiplier: 1.10 },
  { name: 'Walgreens', chain: 'Walgreens', address: '200 Market St', city: 'St. Louis', state: 'MO', zipCode: '63102', phone: '(314) 555-0102', priceMultiplier: 1.12 },
  { name: 'Walmart Pharmacy', chain: 'Walmart', address: '300 West Blvd', city: 'St. Louis', state: 'MO', zipCode: '63103', phone: '(314) 555-0103', priceMultiplier: 0.85 },
  { name: 'Costco Pharmacy', chain: 'Costco', address: '400 Industrial Dr', city: 'St. Louis', state: 'MO', zipCode: '63104', phone: '(314) 555-0104', priceMultiplier: 0.80 },
  { name: 'Kroger Pharmacy', chain: 'Kroger', address: '500 Oak Ave', city: 'St. Louis', state: 'MO', zipCode: '63105', phone: '(314) 555-0105', priceMultiplier: 0.92 },
  { name: 'Rite Aid', chain: 'Rite Aid', address: '600 Elm St', city: 'St. Louis', state: 'MO', zipCode: '63106', phone: '(314) 555-0106', priceMultiplier: 1.08 },
  { name: "Sam's Club Pharmacy", chain: "Sam's Club", address: '700 Valley Rd', city: 'St. Louis', state: 'MO', zipCode: '63107', phone: '(314) 555-0107', priceMultiplier: 0.83 },
  { name: 'Amazon Pharmacy', chain: 'Amazon', address: 'Mail Order', city: 'Seattle', state: 'WA', zipCode: '98101', phone: '(888) 555-0108', priceMultiplier: 0.82 },
];

// ============================================================
// Common Medications with Base Generic Prices (30-day supply)
// Sourced from medication catalog cost.generic values
// ============================================================

const MEDICATIONS = [
  // Cardiovascular
  { name: 'lisinopril', strength: '10mg', form: 'tablet', quantity: 30, basePrice: 8 },
  { name: 'lisinopril', strength: '20mg', form: 'tablet', quantity: 30, basePrice: 10 },
  { name: 'amlodipine', strength: '5mg', form: 'tablet', quantity: 30, basePrice: 8 },
  { name: 'amlodipine', strength: '10mg', form: 'tablet', quantity: 30, basePrice: 10 },
  { name: 'atorvastatin', strength: '20mg', form: 'tablet', quantity: 30, basePrice: 8 },
  { name: 'atorvastatin', strength: '40mg', form: 'tablet', quantity: 30, basePrice: 10 },
  { name: 'losartan', strength: '50mg', form: 'tablet', quantity: 30, basePrice: 12 },
  { name: 'metoprolol', strength: '25mg', form: 'tablet', quantity: 60, basePrice: 8 },
  { name: 'metoprolol', strength: '50mg', form: 'tablet', quantity: 60, basePrice: 10 },

  // Diabetes
  { name: 'metformin', strength: '500mg', form: 'tablet', quantity: 60, basePrice: 8 },
  { name: 'metformin', strength: '1000mg', form: 'tablet', quantity: 60, basePrice: 12 },
  { name: 'glipizide', strength: '5mg', form: 'tablet', quantity: 60, basePrice: 10 },

  // GI
  { name: 'omeprazole', strength: '20mg', form: 'capsule', quantity: 30, basePrice: 8 },
  { name: 'omeprazole', strength: '40mg', form: 'capsule', quantity: 30, basePrice: 12 },
  { name: 'pantoprazole', strength: '40mg', form: 'tablet', quantity: 30, basePrice: 12 },

  // Mental Health
  { name: 'sertraline', strength: '50mg', form: 'tablet', quantity: 30, basePrice: 10 },
  { name: 'sertraline', strength: '100mg', form: 'tablet', quantity: 30, basePrice: 12 },
  { name: 'escitalopram', strength: '10mg', form: 'tablet', quantity: 30, basePrice: 15 },
  { name: 'fluoxetine', strength: '20mg', form: 'capsule', quantity: 30, basePrice: 8 },
  { name: 'bupropion', strength: '150mg', form: 'tablet', quantity: 30, basePrice: 25 },

  // Pain / NSAIDs
  { name: 'ibuprofen', strength: '600mg', form: 'tablet', quantity: 90, basePrice: 10 },
  { name: 'naproxen', strength: '500mg', form: 'tablet', quantity: 60, basePrice: 12 },
  { name: 'acetaminophen', strength: '500mg', form: 'tablet', quantity: 100, basePrice: 8 },
  { name: 'gabapentin', strength: '300mg', form: 'capsule', quantity: 90, basePrice: 15 },
  { name: 'gabapentin', strength: '600mg', form: 'tablet', quantity: 90, basePrice: 20 },

  // Thyroid
  { name: 'levothyroxine', strength: '50mcg', form: 'tablet', quantity: 30, basePrice: 12 },
  { name: 'levothyroxine', strength: '100mcg', form: 'tablet', quantity: 30, basePrice: 15 },

  // Respiratory
  { name: 'montelukast', strength: '10mg', form: 'tablet', quantity: 30, basePrice: 15 },
  { name: 'albuterol', strength: '90mcg', form: 'inhaler', quantity: 1, basePrice: 30 },

  // Antibiotics
  { name: 'amoxicillin', strength: '500mg', form: 'capsule', quantity: 30, basePrice: 8 },
  { name: 'azithromycin', strength: '250mg', form: 'tablet', quantity: 6, basePrice: 12 },

  // Supplements
  { name: 'vitamin d3', strength: '2000IU', form: 'tablet', quantity: 90, basePrice: 8 },
];

// ============================================================
// Seed Function
// ============================================================

async function seedPharmacies() {
  console.log('Seeding pharmacies and medication prices...\n');

  let pharmacyCount = 0;
  let priceCount = 0;

  for (const pharm of PHARMACIES) {
    const { priceMultiplier, ...pharmacyData } = pharm;

    // Upsert pharmacy
    const pharmacy = await prisma.pharmacy.upsert({
      where: { id: `seed_${pharm.chain?.toLowerCase().replace(/[^a-z]/g, '')}` },
      create: {
        id: `seed_${pharm.chain?.toLowerCase().replace(/[^a-z]/g, '')}`,
        ...pharmacyData,
      },
      update: pharmacyData,
    });
    pharmacyCount++;

    // Create prices for each medication
    for (const med of MEDICATIONS) {
      // Add realistic variance: ±5% randomness on top of chain multiplier
      const variance = 0.95 + Math.random() * 0.10;
      const price = Math.round(med.basePrice * priceMultiplier * variance * 100) / 100;

      await prisma.pharmacyPrice.upsert({
        where: {
          pharmacyId_medicationName_strength_form_quantity: {
            pharmacyId: pharmacy.id,
            medicationName: med.name,
            strength: med.strength,
            form: med.form,
            quantity: med.quantity,
          },
        },
        create: {
          pharmacyId: pharmacy.id,
          medicationName: med.name,
          strength: med.strength,
          form: med.form,
          quantity: med.quantity,
          cashPrice: price,
          source: 'seed',
        },
        update: {
          cashPrice: price,
          source: 'seed',
          lastVerified: new Date(),
        },
      });
      priceCount++;
    }

    console.log(`  ✓ ${pharmacy.name} — ${MEDICATIONS.length} prices`);
  }

  console.log(`\nSeeded ${pharmacyCount} pharmacies with ${priceCount} prices.`);
}

// ============================================================
// Run
// ============================================================

seedPharmacies()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
