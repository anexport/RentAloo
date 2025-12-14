-- Migration: Fix payments valid_amounts constraint to include insurance and deposit
--
-- The original payments table enforced:
--   total_amount = subtotal + service_fee + tax
-- After adding insurance_amount and deposit_amount, total_amount now includes those fields.
-- This updates the check constraint to match the current payment breakdown.

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS valid_amounts;

ALTER TABLE public.payments
ADD CONSTRAINT valid_amounts CHECK (
  total_amount = subtotal + service_fee + tax
    + COALESCE(insurance_amount, 0)
    + COALESCE(deposit_amount, 0)
);

COMMENT ON CONSTRAINT valid_amounts ON public.payments IS
'total_amount equals subtotal + service_fee + tax + insurance_amount + deposit_amount';

