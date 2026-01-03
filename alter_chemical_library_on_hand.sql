alter table chemical_library 
add column if not exists is_on_hand boolean default true;

-- Update existing records to default to true if null (though default handles new ones)
update chemical_library set is_on_hand = true where is_on_hand is null;
