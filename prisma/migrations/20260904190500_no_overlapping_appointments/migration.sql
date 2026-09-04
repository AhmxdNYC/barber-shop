-- Makes double-booking impossible at the database, not merely unlikely.
--
-- A read-then-write availability check loses the race when two clients tap
-- the same 3:00pm at the same moment, and that bug only shows up in
-- production on a busy Saturday. Postgres settles it instead: the second
-- INSERT fails, the API returns 409, and the UI refreshes the slot list.
--
-- "barberId" WITH = is the load-bearing part. Without it the constraint is
-- shop-wide and only one chair could ever be occupied at a time.
--
-- This requires "startsAt"/"endsAt" to be timestamptz. Prisma's default
-- DateTime maps to `timestamp without time zone`, and tstzrange() over
-- those is not IMMUTABLE, so the constraint cannot be created. The schema
-- pins @db.Timestamptz(3) for exactly this reason.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "no_overlapping_appointments"
  EXCLUDE USING gist (
    "barberId" WITH =,
    tstzrange("startsAt", "endsAt") WITH &&
  )
  WHERE (
    status = ANY (
      ARRAY['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED']::"AppointmentStatus"[]
    )
  );

-- On PENDING_PAYMENT:
--
-- Unpaid holds take part in the constraint so an in-progress checkout
-- genuinely reserves the slot. An expired hold would then keep blocking it,
-- and `holdExpiresAt > now()` cannot appear in a constraint predicate
-- because it is not IMMUTABLE.
--
-- So the booking transaction expires stale holds immediately before it
-- inserts, and availability queries independently treat expired holds as
-- free. A slot therefore reopens on read, without waiting for a cron job.
