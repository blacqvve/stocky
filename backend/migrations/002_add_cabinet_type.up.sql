-- Add 'cabinet' location type (a furniture unit containing multiple drawers, e.g. IKEA Alex)
ALTER TABLE locations DROP CONSTRAINT locations_type_check;
ALTER TABLE locations ADD CONSTRAINT locations_type_check
    CHECK (type IN ('room', 'rack', 'shelf', 'cabinet', 'drawer', 'grid_bin'));
