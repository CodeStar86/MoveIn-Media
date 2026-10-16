-- Align stored booking selections with the new all-inclusive pricing model.
-- Historical selections remain valid so existing enquiries are retained.
begin;
alter table public.booking_requests drop constraint if exists booking_requests_package_selection_check;
alter table public.booking_requests add constraint booking_requests_package_selection_check
  check (package_selection in (
    'Essential Property Marketing — from £169',
    'Complete Property Marketing — from £249',
    'All-Inclusive Property Marketing — £299 standard',
    'Not sure — please advise'
  ));
-- Actual agency discounts are calculated against completed paid monthly appointments
-- and agreed by the business; the public enquiry form never self-assigns a discount.
commit;
