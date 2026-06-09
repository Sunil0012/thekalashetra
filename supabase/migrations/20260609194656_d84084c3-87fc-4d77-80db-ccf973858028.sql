-- Attach the bid validation/apply trigger (function exists but was never attached)
DROP TRIGGER IF EXISTS trg_apply_bid ON public.bids;
CREATE TRIGGER trg_apply_bid BEFORE INSERT ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.tg_apply_bid();

-- Attach updated_at triggers where the column exists
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['auction_sessions','lots','consignments','admin_requests','profiles']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t);
    END IF;
  END LOOP;
END $$;