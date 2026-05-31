-- MIGRATION STEP 1 (FULL): Insert ALL 37 chemicals into chemical_library
-- Category MUST be one of: 'Exterior', 'Interior', 'Dual-Use'
-- Run this. Should return "37 rows affected".

DELETE FROM chemical_library WHERE id::text LIKE 'a10000%';

INSERT INTO chemical_library (id, name, brand, category, description, used_for, dilution_ratios, created_at, updated_at) VALUES

('a1000001-0000-0000-0000-000000000001', '3D ONE Car Polish & Buffing Compound', '3D', 'Exterior',
'One-step hybrid compound and polish combining aggressive cutting power with fine finishing ability. Uses ceramic alumina abrasives that never dust or dry out. Level of cut is controlled by pad type. Safe on single-stage and clear coat paint. Removes swirl marks, scratches, water spots, and oxidation.',
ARRAY['Paint Correction','Scratch Removal','Swirl Removal','Oxidation'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Scratch Removal","ratio":"RTU (use cutting pad)"},{"label":"Finishing/Polish","ratio":"RTU (use finishing pad)"}]'::jsonb, NOW(), NOW()),

('a1000002-0000-0000-0000-000000000002', 'APC — All Purpose Cleaner', 'Meguiar''s', 'Dual-Use',
'Highly concentrated, pH-balanced, multi-surface cleaner. Low-sudsing foaming action lifts dirt and grease from virtually any automotive surface. Safe on clear plastic, glass, leather, vinyl, carpets, door jambs, engine bays, and wheel wells. Extremely cost-effective.',
ARRAY['Interior Cleaning','Exterior Cleaning','Degreasing','Leather','Vinyl','Carpet','Engine Bay'],
'[{"label":"Maintenance / Light","ratio":"20:1"},{"label":"Standard","ratio":"10:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000003-0000-0000-0000-000000000003', 'Aqua Gloss', 'Superior Products', 'Exterior',
'Water-based tire and trim dressing delivering a high-gloss, long-lasting shine without the sling of solvent-based dressings. UV inhibitors protect tires and trim from fading, cracking, and drying caused by sun and ozone exposure. Safe for all rubber, plastic, and vinyl surfaces.',
ARRAY['Tire Dressing','Trim Dressing','Plastic Restoration','UV Protection'],
'[{"label":"Maintenance / Light","ratio":"4:1"},{"label":"Standard","ratio":"2:1"},{"label":"Heavy Dirt / Degreasing","ratio":"1:1 (RTU)"}]'::jsonb, NOW(), NOW()),

('a1000004-0000-0000-0000-000000000004', 'Armor All Multi Purpose Cleaner', 'Armor All', 'Interior',
'Versatile all-surface interior cleaner that quickly and safely removes dirt, dust, stains, and light grease from vinyl, plastic, leather, fabric, and rubber. pH-balanced, leaves surfaces clean and residue-free with no greasy film.',
ARRAY['Interior Cleaning','Dash','Door Panels','Console','Vinyl','Rubber'],
'[{"label":"Maintenance / Light","ratio":"RTU"},{"label":"Standard","ratio":"RTU"},{"label":"Heavy Dirt / Degreasing","ratio":"RTU"}]'::jsonb, NOW(), NOW()),

('a1000005-0000-0000-0000-000000000005', 'Armor All Wheel & Tire Cleaner', 'Armor All', 'Exterior',
'Powerful wheel and tire cleaner that dissolves brake dust, road grime, tar, and built-up dirt from all wheel and tire surfaces. Foaming action clings to vertical surfaces for maximum dwell time. Safe on alloy, chrome, painted, and clear-coated wheels.',
ARRAY['Wheel Cleaning','Tire Cleaning','Brake Dust','Iron Removal'],
'[{"label":"Maintenance / Light","ratio":"RTU"},{"label":"Standard","ratio":"RTU"},{"label":"Heavy Dirt / Degreasing","ratio":"RTU"}]'::jsonb, NOW(), NOW()),

('a1000006-0000-0000-0000-000000000006', 'Carpet Bomber', 'P&S', 'Interior',
'Professional-grade carpet and upholstery cleaner powered by citrus derivatives and biodegradable cleaners. Step 2 of the P&S Double Black Interior Cleaning System. Dissolves grease and lifts embedded dirt from carpet fibers and upholstery without harsh chemicals. Also functions as an engine degreaser at higher concentrations.',
ARRAY['Carpet Cleaning','Upholstery','Fabric Seats','Engine Bay','Wheel Wells'],
'[{"label":"Maintenance / Light","ratio":"8:1"},{"label":"Standard","ratio":"7:1"},{"label":"Heavy Dirt / Degreasing","ratio":"5:1"}]'::jsonb, NOW(), NOW()),

('a1000007-0000-0000-0000-000000000007', 'Ceramic Coating — Cerakote', 'Cerakote', 'Exterior',
'World-class professional-grade ceramic coating delivering extraordinary mirror-like gloss, extreme hydrophobicity, and long-lasting protection lasting 500+ real-world washes. Creates a ceramic barrier on paint that repels water, dirt, UV rays, and contaminants. Customer-ready within 2 hours, washable after 24 hours.',
ARRAY['Ceramic Coating','Paint Protection','Hydrophobic','UV Protection'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Full Vehicle Coating","ratio":"RTU"}]'::jsonb, NOW(), NOW()),

('a1000008-0000-0000-0000-000000000008', 'Ceramic Acrylic Black Wax', 'Turtle Wax', 'Exterior',
'Premium black paint enhancer and protectant for black, dark blue, and dark-colored vehicles. Advanced ceramic and acrylic formula deepens color, eliminates light swirls, and fills minor surface imperfections. Carnauba wax provides a warm, wet-look gloss especially flattering on dark paint.',
ARRAY['Dark Paint Enhancement','Swirl Removal','Paint Protection','Ceramic Wax'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Second Coat Application","ratio":"RTU"}]'::jsonb, NOW(), NOW()),

('a1000009-0000-0000-0000-000000000009', 'Ceramic Graphene Inside Job', 'Turtle Wax', 'Interior',
'All-in-one interior care and protection product infused with ceramic and graphene technology to repel dust, reduce static, and deliver superior UV protection. Natural enzymes break down stains and encapsulate odors. pH-balanced with aloe vera and conditioning oils. Safe on all interior surfaces including touchscreens.',
ARRAY['Interior Cleaning','Leather','Vinyl','Plastic','UV Protection','Odor Removal'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Deep Conditioning","ratio":"RTU (apply second coat)"}]'::jsonb, NOW(), NOW()),

('a1000010-0000-0000-0000-000000000010', 'Cherry Foam', 'Superior Products', 'Exterior',
'Rich, high-foaming pH-neutral car wash shampoo with a pleasant cherry fragrance. Thick foam clings to painted surfaces and gently lifts dirt without stripping wax or sealant protection. Compatible with foam cannons, foam guns, and traditional bucket wash methods.',
ARRAY['Car Wash','Foam Cannon','Paint Safe','Pre-Wash'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"6:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000011-0000-0000-0000-000000000011', 'Cover All', 'Superior Products', 'Dual-Use',
'Professional-grade all-in-one interior and exterior surface dressing and protectant. Designed to clean, shine, and protect dashboards, door panels, tires, engine bays, plastic trim, and rubber seals in a single application. UV inhibitors protect from fading and cracking.',
ARRAY['Interior Dressing','Tire Dressing','Plastic','Rubber','UV Protection'],
'[{"label":"Maintenance / Light","ratio":"RTU"},{"label":"Standard","ratio":"RTU"},{"label":"Heavy Dirt / Degreasing","ratio":"RTU"}]'::jsonb, NOW(), NOW()),

('a1000012-0000-0000-0000-000000000012', 'Dark Fury', 'Superior Products', 'Exterior',
'Concentrated, heavy-duty wheel and tire cleaner that instantly dissolves brake dust, road tar, iron deposits, and built-up contamination. Acid-free formula turns purple/red on contact with iron particles as a visual indicator. Safe on all wheel types at correct dilution.',
ARRAY['Wheel Cleaning','Brake Dust','Iron Removal','Tire Cleaning','Decontamination'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"7:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000013-0000-0000-0000-000000000013', 'Dirt Buster', 'Superior Products', 'Interior',
'Concentrated general-purpose interior cleaner for plastics, vinyl, and hard interior surfaces. Quickly penetrates and dissolves surface dirt, dust, grease, and grime. Gentle enough for daily-use surfaces while still effective on heavily soiled plastic trim. Leaves a clean, factory-fresh appearance with no greasy film.',
ARRAY['Interior Cleaning','Plastic','Vinyl','Dashboard','Door Panels','Console'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"10:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000014-0000-0000-0000-000000000014', 'Does It All Enzyme Cleaner', 'Superior Products', 'Interior',
'Professional-strength enzyme-based cleaner and deodorizer that biologically breaks down organic stains and odors at the molecular level. Targets protein-based stains including urine, blood, vomit, food spills, and pet-related soiling. Permanently eliminates odors rather than masking them. Biodegradable formula.',
ARRAY['Odor Removal','Stain Removal','Enzyme Cleaner','Pet Stains','Carpet','Upholstery'],
'[{"label":"Maintenance / Light","ratio":"RTU"},{"label":"Standard","ratio":"RTU"},{"label":"Heavy Dirt / Degreasing","ratio":"RTU (multiple passes for severe odors)"}]'::jsonb, NOW(), NOW()),

('a1000015-0000-0000-0000-000000000015', 'EZ Shine', 'Superior Products', 'Exterior',
'Spray-on, wipe-off exterior detail spray and shine enhancer for fast application between full washes. Instantly removes light dust, fingerprints, water spots, and fresh bird droppings while adding a layer of protection and gloss. Lubricating formula reduces marring risk during dry wiping.',
ARRAY['Quick Detailer','Paint Maintenance','Water Spot Removal','Clay Lubricant'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Clay Bar Lubricant","ratio":"RTU (mist lightly ahead of clay)"}]'::jsonb, NOW(), NOW()),

('a1000016-0000-0000-0000-000000000016', 'Formula 4', 'Superior Products', 'Exterior',
'Premium rapid drying aid and polymer paint sealant applied to wet paint immediately after rinsing. Polymer formula bonds to paint during drying, fighting hard water spots by encapsulating minerals before they etch. Unique ability to fight water spots even in direct sunlight — critical for mobile detailers.',
ARRAY['Drying Aid','Water Spot Prevention','Paint Sealant','Polymer Protection'],
'[{"label":"Maintenance / Light","ratio":"20:1"},{"label":"Standard","ratio":"20:1"},{"label":"Heavy Dirt / Degreasing","ratio":"20:1"}]'::jsonb, NOW(), NOW()),

('a1000017-0000-0000-0000-000000000017', 'Gold Class Shampoo & Conditioner', 'Meguiar''s', 'Exterior',
'Premium rich-foaming car wash soap that cleans and conditions paint simultaneously. Gently lifts dirt without stripping wax, sealant, or ceramic coating. Premium paint conditioners reveal color clarity and add a radiant shine with every wash. pH-neutral and biodegradable.',
ARRAY['Car Wash','Paint Safe','Foam Cannon','Paint Conditioning'],
'[{"label":"Maintenance / Light","ratio":"5:1"},{"label":"Standard","ratio":"5:1"},{"label":"Foam Cannon","ratio":"5:1"}]'::jsonb, NOW(), NOW()),

('a1000018-0000-0000-0000-000000000018', 'Green All', 'Superior Products', 'Dual-Use',
'Eco-friendly, biodegradable all-purpose cleaner and degreaser formulated with environmentally responsible ingredients. Effectively cleans interior and exterior automotive surfaces without harsh solvents or toxic chemicals. Low VOC formula safe for use in enclosed spaces.',
ARRAY['Eco-Friendly','Interior Cleaning','Exterior Cleaning','Degreasing','Plastic','Vinyl'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"6:1"},{"label":"Heavy Dirt / Degreasing","ratio":"3:1"}]'::jsonb, NOW(), NOW()),

('a1000019-0000-0000-0000-000000000019', 'Interior Detailer & Protectant — Cerakote', 'Cerakote', 'Interior',
'Professional-grade interior care spray that cleans, protects, and restores all interior surfaces using ceramic technology. Creates a protective ceramic layer on dashboard plastics, vinyl, leather, and rubber that repels dust, UV rays, and contaminants. Leaves a clean, factory-natural finish with no greasy film.',
ARRAY['Interior Cleaning','Ceramic Protection','UV Protection','Leather','Vinyl','Plastic'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Deep Treatment","ratio":"RTU (apply second coat)"}]'::jsonb, NOW(), NOW()),

('a1000020-0000-0000-0000-000000000020', 'Invisible Glass Cleaner', 'Invisible Glass', 'Dual-Use',
'Industry-leading automotive glass cleaner. Alcohol-free, ammonia-free formulation safe for tinted windows and UV-protective coatings. Instantly dissolves film buildup, fingerprints, road haze, and interior outgassing residue. Evaporates cleanly leaving absolutely no streaks or residue.',
ARRAY['Glass Cleaning','Windshield','Windows','Mirrors','Tinted Windows'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Heavily Soiled Glass","ratio":"RTU (double pass)"}]'::jsonb, NOW(), NOW()),

('a1000021-0000-0000-0000-000000000021', 'Leather Cleaner', 'Chemical Guys', 'Interior',
'pH-balanced professional-grade leather cleaning solution that safely lifts dirt, body oils, grease, and embedded grime from natural, sealed, and synthetic leather. Penetrates deep into leather pores without stripping natural oils or changing texture or color. Prepares leather for conditioning.',
ARRAY['Leather Cleaning','Leather Seats','Steering Wheel','Leather Trim'],
'[{"label":"Maintenance / Light","ratio":"6:1"},{"label":"Standard","ratio":"4:1"},{"label":"Heavy Dirt / Degreasing","ratio":"2:1"}]'::jsonb, NOW(), NOW()),

('a1000022-0000-0000-0000-000000000022', 'Leather Conditioner', 'Chemical Guys', 'Interior',
'Premium nourishing leather treatment that restores softness, suppleness, and rich natural appearance after cleaning. Penetrates deep into leather pores to replenish essential natural oils. Prevents leather from drying out, cracking, and fading. Leaves leather feeling smooth and luxurious — never greasy.',
ARRAY['Leather Conditioning','Leather Protection','Crack Prevention','UV Protection'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Dry / Cracked Leather","ratio":"RTU (apply second coat after first absorbs)"}]'::jsonb, NOW(), NOW()),

('a1000023-0000-0000-0000-000000000023', 'Muscle Magic', 'Superior Products', 'Exterior',
'Heavy-duty, high-alkaline degreaser that cuts through the toughest grease, oil, and grime on engine bays, undercarriages, wheel wells, and heavily soiled exterior surfaces. Dissolves petroleum-based deposits, road tar, and mechanical grime on contact. Fast-acting and highly dilutable.',
ARRAY['Engine Degreasing','Wheel Wells','Undercarriage','Heavy Duty Degreasing'],
'[{"label":"Maintenance / Light","ratio":"20:1"},{"label":"Standard","ratio":"10:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000024-0000-0000-0000-000000000024', 'ONR — Optimum No Rinse', 'Optimum', 'Dual-Use',
'The original rinseless car wash product using substantive polymer technology that encapsulates dirt and lubricates paint during cleaning. Eliminates need for rinsing. Functions as a rinseless wash, waterless wash, quick detailer, clay bar lubricant, drying aid, interior cleaner, and glass cleaner depending on dilution.',
ARRAY['Rinseless Wash','Waterless Wash','Clay Lubricant','Quick Detailer','Drying Aid'],
'[{"label":"Rinseless / Waterless Wash","ratio":"256:1 (1 oz per 2 gallons)"},{"label":"Quick Detailer / Drying Aid","ratio":"16:1"},{"label":"Clay Bar Lubricant","ratio":"64:1"}]'::jsonb, NOW(), NOW()),

('a1000025-0000-0000-0000-000000000025', 'P&S Xpress Interior Cleaner', 'P&S', 'Interior',
'Professional quick-spray interior cleaner delivering an instant factory-fresh finish on all interior surfaces without product buildup. Fast-acting, non-greasy formula dissolves surface dirt, dust, fingerprints, and light stains in seconds. Safe on leather, vinyl, plastic, rubber, and fabric.',
ARRAY['Interior Cleaning','Leather','Vinyl','Plastic','Rubber','Quick Detail'],
'[{"label":"Maintenance / Light","ratio":"3:1"},{"label":"Standard","ratio":"1:1"},{"label":"Heavy Dirt / Degreasing","ratio":"1:1"}]'::jsonb, NOW(), NOW()),

('a1000026-0000-0000-0000-000000000026', 'Pink Perfection', 'Superior Products', 'Dual-Use',
'High-performance, concentrated all-purpose cleaner and degreaser for interior and exterior pre-treatment. Cuts through grease, oil, and embedded dirt on a wide variety of surfaces. Color-coded pink for easy identification. Safe on carpets, upholstery, vinyl, plastic, engine bays, and wheel wells at appropriate dilution.',
ARRAY['Interior Cleaning','Exterior Cleaning','Pre-Treatment','Degreasing','Carpet','Vinyl'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"10:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000027-0000-0000-0000-000000000027', 'Quick Detailer', 'Meguiar''s', 'Exterior',
'Professional-grade spray detailer for fast surface decontamination and instant gloss enhancement between full wash and wax sessions. Lubricating polymer formula safely encapsulates and removes light dust, fingerprints, bird droppings, and water spots. Simultaneously lays down a protective polymer layer.',
ARRAY['Quick Detailer','Paint Maintenance','Water Spot Removal','Clay Lubricant','Gloss Enhancement'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Clay Bar Lubricant","ratio":"RTU (mist lightly ahead of clay)"}]'::jsonb, NOW(), NOW()),

('a1000028-0000-0000-0000-000000000028', 'Rain-X Glass Water Repellent', 'Rain-X', 'Exterior',
'World''s most recognized glass water repellent. Advanced silicone formula bonds to glass at a molecular level creating an invisible hydrophobic barrier. Causes rain, sleet, and snow to bead up and roll off windshields at speeds above 45 MPH. Dramatically improves wet weather driving visibility.',
ARRAY['Glass Treatment','Water Repellent','Windshield Protection','Hydrophobic Glass'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Maximum Protection","ratio":"RTU (apply second coat)"}]'::jsonb, NOW(), NOW()),

('a1000029-0000-0000-0000-000000000029', 'Road Warrior', 'Superior Products', 'Exterior',
'Powerful exterior pre-treatment spray that dissolves bugs, road tar, tree sap, bird droppings, and heavy road grime from painted surfaces, bumpers, grilles, and glass. Fast-acting formula breaks down protein and petroleum-based adhesion of bug splatter. Significantly reduces effort needed during washing.',
ARRAY['Bug Removal','Pre-Wash','Road Grime','Tar Removal','Bird Dropping Removal'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"10:1"},{"label":"Heavy Dirt / Degreasing","ratio":"4:1"}]'::jsonb, NOW(), NOW()),

('a1000030-0000-0000-0000-000000000030', 'Spray Wax', 'Superior Products', 'Exterior',
'Professional high-gloss spray-on paint protection for fast application on wet or dry painted surfaces. Polymer-infused formula delivers brilliant, deep shine and a protective layer of wax-like protection. Repels water, dust, and light contamination. Compatible with foam cannons.',
ARRAY['Paint Protection','Spray Wax','Drying Aid','Gloss Enhancement','Quick Wax'],
'[{"label":"Maintenance / Light","ratio":"RTU"},{"label":"Standard","ratio":"RTU"},{"label":"Heavy Dirt / Degreasing","ratio":"RTU"}]'::jsonb, NOW(), NOW()),

('a1000031-0000-0000-0000-000000000031', 'Super Shine 2', 'Superior Products', 'Exterior',
'Professional-grade, high-gloss tire and rubber dressing for a long-lasting, rich wet-look shine on tires, rubber trim, and plastic bumpers. Advanced formula penetrates rubber to condition and protect from UV damage, ozone cracking, and premature aging. Resists water washoff for extended durability.',
ARRAY['Tire Dressing','Rubber Dressing','Plastic Trim','UV Protection','Wet-Look Shine'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Extended Shine","ratio":"RTU (apply second coat after first dries)"}]'::jsonb, NOW(), NOW()),

('a1000032-0000-0000-0000-000000000032', 'Supreme Wash & Wax', 'Chemical Guys', 'Exterior',
'Premium pH-neutral car wash shampoo infused with real carnauba wax that cleans and waxes simultaneously in a single wash step. Rich foaming formula gently lifts dirt while depositing a protective layer of carnauba wax — boosting gloss, depth, and water beading with every wash.',
ARRAY['Car Wash','Carnauba Wax','Paint Protection','Foam Cannon'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"5:1"},{"label":"Foam Cannon","ratio":"3:1"}]'::jsonb, NOW(), NOW()),

('a1000033-0000-0000-0000-000000000033', 'Terminator', 'P&S', 'Interior',
'Professional-strength enzyme-based spot and stain remover. Step 1 of the P&S Double Black Interior Cleaning System. Uses enzymes, dry and wet cleaning chemicals, and degreasers to attack stubborn soil, grease, and protein-based stains. Permanently eliminates odors. Pairs with Carpet Bomber (Step 2).',
ARRAY['Stain Removal','Odor Removal','Enzyme Cleaner','Pet Stains','Pre-Treatment','Carpet','Upholstery'],
'[{"label":"Maintenance / Light","ratio":"RTU"},{"label":"Standard","ratio":"RTU"},{"label":"Heavy Dirt / Degreasing","ratio":"RTU (multiple passes for severe stains)"}]'::jsonb, NOW(), NOW()),

('a1000034-0000-0000-0000-000000000034', 'Total Interior Cleaner & Protectant', 'Chemical Guys', 'Interior',
'Versatile one-step interior detailing spray that cleans and protects multiple surfaces simultaneously. Safely removes dust, light stains, fingerprints, and surface contamination from leather, vinyl, plastic, rubber, and fabric. Leaves behind a UV-protective layer. Clean, natural factory-style finish — no greasy shine.',
ARRAY['Interior Cleaning','Interior Protection','UV Protection','Leather','Vinyl','Plastic','Fabric'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Deep Clean","ratio":"RTU (apply with detailing brush)"}]'::jsonb, NOW(), NOW()),

('a1000035-0000-0000-0000-000000000035', 'Trim Coat Restoration Kit', 'Cerakote', 'Exterior',
'Professional ceramic trim restoration system that permanently restores faded, gray, chalky exterior plastic trim back to a rich, deep black finish. Bonds permanently to plastic surfaces — unlike temporary dressings — providing restoration that lasts years. Provides long-lasting UV protection.',
ARRAY['Trim Restoration','Faded Plastic Restoration','Ceramic Coating','UV Protection'],
'[{"label":"Standard","ratio":"RTU (supplied in kit)"},{"label":"Severely Faded Trim","ratio":"RTU (apply second coat after first cures)"}]'::jsonb, NOW(), NOW()),

('a1000036-0000-0000-0000-000000000036', 'Wax & Dry X2', 'Turtle Wax', 'Exterior',
'Spray-on, wipe-off wax and drying aid for rapid application immediately after the final rinse on wet paint. Polymer and wax-infused formula simultaneously dries the vehicle and applies a protective wax coating in one step. Creates a hydrophobic barrier that repels water and light contamination.',
ARRAY['Drying Aid','Spray Wax','Paint Protection','Hydrophobic','Time-Efficient'],
'[{"label":"Standard","ratio":"RTU"},{"label":"Foam Cannon Additive","ratio":"RTU (add to final rinse bucket)"}]'::jsonb, NOW(), NOW()),

('a1000037-0000-0000-0000-000000000037', 'Zap It', 'Superior Products', 'Dual-Use',
'Fast-acting, concentrated spot remover and stain eliminator that instantly attacks stubborn interior stains, tar spots, adhesive residue, tree sap, and exterior contamination. Powerful formula penetrates stain-causing materials quickly for efficient removal without excessive scrubbing. Safe on paint, vinyl, carpet, and upholstery at correct dilution.',
ARRAY['Spot Remover','Stain Removal','Tar Removal','Adhesive Removal','Carpet','Upholstery','Paint'],
'[{"label":"Maintenance / Light","ratio":"10:1"},{"label":"Standard","ratio":"5:1"},{"label":"Heavy Dirt / Degreasing","ratio":"1:1 (RTU for extreme spots)"}]'::jsonb, NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, brand = EXCLUDED.brand, category = EXCLUDED.category,
  description = EXCLUDED.description, dilution_ratios = EXCLUDED.dilution_ratios,
  updated_at = NOW();

-- Verify (should show 37 rows):
SELECT id, name, brand, category FROM chemical_library WHERE id::text LIKE 'a10000%' ORDER BY name;
