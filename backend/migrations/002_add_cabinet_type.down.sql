-- Revert cabinet type (reassign any cabinet rows to shelf before dropping)
UPDATE locations SET type = 'shelf' WHERE type = 'cabinet';
ALTER TABLE locations DROP CONSTRAINT locations_type_check;
ALTER TABLE locations ADD CONSTRAINT locations_type_check
    CHECK (type IN ('room', 'rack', 'shelf', 'drawer', 'grid_bin'));
