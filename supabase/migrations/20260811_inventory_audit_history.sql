CREATE TABLE IF NOT EXISTS inventory_audit_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp timestamptz NOT NULL,
    status text NOT NULL CHECK (status IN ('in-progress', 'completed')),
    note text,
    chem_audit jsonb NOT NULL,
    supply_audit jsonb NOT NULL,
    equip_audit jsonb NOT NULL,
    active_tab text NOT NULL,
    total_counted integer NOT NULL,
    created_at timestamptz DEFAULT now()
);
