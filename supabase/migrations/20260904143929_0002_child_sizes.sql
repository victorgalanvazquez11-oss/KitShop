/*
# Add child shirt sizes

1. Changes
- Add `size_group` to `sizes` so adult and child sizes are managed separately.
- Existing sizes remain in the adult group.
- Seed child sizes 16, 18, 20, 22, 24, 26, and 28 from the provided reference chart.

2. Security
- Existing RLS policies remain active for public reads and authenticated administration.
*/

ALTER TABLE sizes
  ADD COLUMN IF NOT EXISTS size_group text NOT NULL DEFAULT 'adult';

UPDATE sizes
SET size_group = 'adult'
WHERE size_group IS NULL OR size_group = '';

INSERT INTO sizes (label, sort_order, size_group) VALUES
  ('16', 1, 'child'),
  ('18', 2, 'child'),
  ('20', 3, 'child'),
  ('22', 4, 'child'),
  ('24', 5, 'child'),
  ('26', 6, 'child'),
  ('28', 7, 'child')
ON CONFLICT (label) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_sizes_group_order ON sizes(size_group, sort_order);