import { prisma } from '../client';

export async function seedSystemSettings() {
  const defaultSettings = [
    // --- Store & POS Operations ---
    {
      key: 'STORE_NAME',
      value: 'My Store Hardware & Supplies',
      description: 'Official store name printed on receipts and invoices',
    },
    {
      key: 'TAX_RATE_PERCENT',
      value: '12.0',
      description: 'Default Value Added Tax (VAT) rate percentage',
    },
    {
      key: 'CURRENCY_SYMBOL',
      value: '₱',
      description: 'Currency symbol displayed on receipts and UI',
    },
    {
      key: 'RECEIPT_FOOTER_MESSAGE',
      value:
        'Thank you for shopping with us! Please keep this receipt for returns.',
      description: 'Custom message printed at the bottom of sales receipts',
    },

    // --- Returns & Refunds ---
    {
      key: 'RETURN_WINDOW_DAYS',
      value: '14',
      description:
        'Number of days a customer has to return or exchange purchased items',
    },
    {
      key: 'REQUIRE_RECEIPT_FOR_RETURN',
      value: 'true',
      description:
        'Whether a valid receipt is mandatory to process an item return',
    },
    {
      key: 'RESTOCKING_FEE_PERCENT',
      value: '0',
      description: 'Percentage fee deducted from customer return refund amount',
    },

    // --- Inventory & Stock Control ---
    {
      key: 'ALLOW_NEGATIVE_INVENTORY',
      value: 'true',
      description:
        'Allows POS checkout even if available product quantity is 0 or lower',
    },

    // --- Sales & Discounts ---
    {
      key: 'ENABLE_WHOLESALE_PRICING',
      value: 'true',
      description:
        'Enables tier/wholesale pricing options on eligible items during POS checkout',
    },

    // --- System & Hardware ---
    // {
    //   key: 'LOW_PAPER_WARNING',
    //   value: 'true',
    //   description:
    //     'Triggers UI alert on POS terminal when thermal receipt paper is low',
    // },
  ];

  for (const setting of defaultSettings) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.systemSetting.create({
        data: setting,
      });
    }
  }

  console.log('Seed: System settings seeded.');
}
