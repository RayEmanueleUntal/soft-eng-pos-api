import { ApiBodyOptions } from '@nestjs/swagger';
import { CheckoutDto } from './requests';

export const CheckoutApiBodyOptions: ApiBodyOptions = {
  type: () => CheckoutDto, // import CheckoutDto
  examples: {
    cashCheckout: {
      summary: 'Cash Transaction Example',
      value: {
        customerId: 1,
        transaction_type: 'RETAIL',
        items: [
          {
            productId: 1,
            quantity_sold: 2,
            current_uom: 'PCS',
            transaction_type: 'RETAIL',
            line_discount: 10,
          },
        ],
        payments: [
          {
            payment_method: 'CASH',
            amount_paid: 450.0,
            details: {
              cash_tendered: 500.0,
              change_given: 50.0,
            },
          },
        ],
        override: false,
      },
    },
    gcashCheckout: {
      summary: 'GCash Transaction Example',
      value: {
        customerId: 1,
        transaction_type: 'RETAIL',
        items: [
          {
            productId: 2,
            quantity_sold: 1,
            current_uom: 'PCS',
            transaction_type: 'RETAIL',
            line_discount: 0,
          },
        ],
        payments: [
          {
            payment_method: 'GCASH',
            amount_paid: 1200.0,
            details: {
              reference_number: '801234567890',
              gcash_mobile_number: '09171234567',
            },
          },
        ],
        override: false,
      },
    },
    creditCheckout: {
      summary: 'Credit Transaction Example',
      value: {
        customerId: 1,
        transaction_type: 'RETAIL',
        items: [
          {
            productId: 2,
            quantity_sold: 1,
            current_uom: 'PCS',
            transaction_type: 'WHOLESALE',
            line_discount: 0,
          },
        ],
        payments: [
          {
            payment_method: 'CREDIT',
            amount_paid: 1200.0,
            details: {
              date: '2026-08-27T00:00:00.000Z',
            },
          },
        ],
        override: false,
      },
    },
  },
};
