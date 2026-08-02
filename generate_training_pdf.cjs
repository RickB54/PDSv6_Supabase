const PDFDocument = require('pdfkit');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kqhaoyaermsqrilhsfxj.supabase.co',
  'sb_publishable_M-awoZwxW-QkZowTBFBMcA_82zAOncq'
);

const doc = new PDFDocument({ margin: 40 });
const pdfPath = 'PAD_Employee_Facing_Training_Checklist.pdf';
const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

doc.fontSize(20).text('PAD Employee Training Checklist', { align: 'center' });
doc.moveDown();

function addStep(title, points) {
  doc.fontSize(12).font('Helvetica-Bold').text(`[ ] ${title}`);
  doc.fontSize(10).font('Helvetica');
  points.forEach(p => {
    doc.text(`    • ${p}`);
  });
  doc.moveDown(0.5);
}

// Exterior
doc.fontSize(16).font('Helvetica-Bold').text('EXTERIOR', { underline: true });
doc.moveDown(0.5);
addStep('Wheels & Tires First', [
  'If Engine Bay Cleaning addon is included, perform engine bay cleaning first',
  'Use Dirt Buster or Muscle Magic at appropriate dilution on engine bay, cover electronics',
  'Chemical: Dark Fury 4:1 or 7:1 (Alternative: Meguiar\'s APC 4:1)',
  'Agitate with brush, no dwell time needed'
]);
addStep('Pre-Rinse whole vehicle', [
  'Skip if clean maintenance detail',
  'Rinse top to bottom always',
  'Open doors slightly to flow water through jambs without flooding'
]);
addStep('Pre-Treat bugs / heavy grime', [
  'Road Warrior 4:1 for bugs (front grill, hood, bumper)',
  'Muscle Magic or Dirt Buster for heavy grime',
  'Apply to dry surface before rinse/foam',
  'Pay extra attention to lower front panels and grille openings'
]);
addStep('Foam Bath', [
  'Apply thick even layer top to bottom',
  'Dwell Time: 3-5 minutes',
  'Do not let foam dry on paint - mist with water if necessary'
]);
addStep('Hand Wash (Top to Bottom)', [
  'Use multiple clean microfiber towels or wash mitts',
  'One side of towel at a time, flip to clean side before next panel',
  'Work top to bottom - roof first, rocker panels/bumpers last',
  'Driver\'s side front to back, passenger side back to front',
  'Never use towel/mitt that touched wheels/lower panels on upper paint'
]);
addStep('Final Rinse', [
  'Rinse top to bottom',
  'If Clay Bar Decon addon included, proceed directly while wet',
  'Use APC as lubricant for clay, fold frequently, work until glass smooth'
]);
addStep('Drying', [
  'Open all door jambs, trunk, and hood during drying to prevent drips',
  'Dry jambs as part of this step',
  'Formula 4 at 20:1 acts as drying aid and adds light protection'
]);
addStep('Paint Protection', [
  'Formula 4 is already applied during drying step',
  'This step confirms protection has been applied',
  'No additional product needed unless a separate wax/sealant addon is included'
]);

doc.addPage();
// Interior
doc.fontSize(16).font('Helvetica-Bold').text('INTERIOR', { underline: true });
doc.moveDown(0.5);
addStep('Remove Personal Items & Trash', [
  'Remove all personal items, trash, and loose belongings',
  'Set aside safely for the customer before starting interior work'
]);
addStep('Thorough Vacuum (Top to Bottom)', [
  'Blow out interior with compressed air first (vents, tracks, under seats)',
  'Use crevice tool for seat tracks and tight areas',
  'Work rear to front within each section',
  'Vacuum all carpets, seats, and crevices'
]);
addStep('Clean Floor Mats & Area Rugs', [
  'Use drill brush set - select based on mat type/dirtiness',
  'Primary chemicals: Carpet Bomber + Terminator duo',
  'For organic stains: SP Does It All Enzyme Cleaner (apply, dwell, agitate, wipe)',
  'Rubber mats: rinse thoroughly. Carpet mats: blot dry, set aside'
]);
addStep('Clean Dashboard, Steering Wheel & Console', [
  'Does It All Enzyme Cleaner or Pink Perfection 10:1 for general wipe',
  'Detail brush for vent slats, button gaps, seam areas',
  'Steering wheel gets extra attention',
  'Work driver\'s side front to back, passenger side back to front'
]);
addStep('Clean All Interior Plastics / Vinyl / Trim', [
  'Does It All Enzyme Cleaner for organic stains on vinyl and trim',
  'Green All at appropriate dilution for general plastics',
  'Avoid over-application of dressing near driver\'s line of sight (glare)'
]);
addStep('Clean Fabric / Carpet / Seats', [
  'Agitate with stiff carpet or drill brush in straight strokes',
  'Blot with clean microfiber to pull out loosened soil',
  'For organic stains: SP Does It All Enzyme Cleaner',
  'Pet hair removal tools before chemical if pet hair is present'
]);
addStep('Interior Protectant / Plastics Finisher', [
  'Apply P&S Xpress 3:1 or SP Cover All 4:1 to all plastics/vinyl/trim',
  'Use clean microfiber applicator',
  'Work driver\'s side front to back, passenger side back to front',
  'Complete before windows to catch overspray (or carefully as last step)'
]);
addStep('Windows & Glass (streak-free)', [
  'Use Invisible Glass - spray on dedicated glass towel only',
  'Two-pass method: first pass removes film, second pass clears streaks',
  'Interior windshield is most difficult (film from off-gassing/HVAC)',
  'Check from multiple angles in light to confirm no haze'
]);
addStep('Clean Door Jambs & Trunk Jambs', [
  'Use Dirt Buster or APC at appropriate dilution',
  'Detail brush for hinge areas and tight corners',
  'Wipe dry thoroughly. Include hood and trunk jambs',
  'Avoid saturating weather stripping - clean and wipe immediately'
]);
addStep('Final Interior Inspection', [
  'Sit in driver\'s seat and check windshield for haze from multiple angles',
  'Open each door and confirm jambs are clean and dry',
  'Confirm floor mats reinstalled correctly',
  'Interior should smell clean - not chemical'
]);

doc.end();

stream.on('finish', async () => {
  console.log('PDF generated locally. Uploading to Supabase...');
  const fileBuffer = fs.readFileSync(pdfPath);
  
  const { data, error } = await supabase.storage
    .from('training-documents')
    .upload('PAD_Employee_Facing_Training_Checklist.pdf', fileBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    
  if (error) {
    console.error('Upload failed:', error);
  } else {
    console.log('Upload successful:', data);
  }
});
