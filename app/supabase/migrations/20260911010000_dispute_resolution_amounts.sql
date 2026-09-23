
-- The split belongs beside the reason, not in a log scan.
--
-- The freelancer's view of a settled dispute read the amounts from the
-- DisputeResolved event via a windowed getLogs scan. That scan looks back a
-- fixed number of chunks — about 108,000 blocks, named CHUNKS_PER_DAY, which
-- is nothing like a day on Arc. An hour after a dispute was resolved the
-- amounts simply stopped being found, and the freelancer's record of what had
-- been decided about their own payment quietly emptied out.
--
-- The arbiter knows both numbers at the moment they resolve. Writing them with
-- the reason makes one row the whole decision: what was split, and why. The
-- chain remains the authority — this is a copy of an event it already emitted,
-- the same way the cover letter beside an application is a copy.

alter table public.dispute_resolutions
  add column if not exists freelancer_amount numeric,
  add column if not exists client_amount numeric;
