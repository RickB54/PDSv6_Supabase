const fs = require('fs');
let content = fs.readFileSync('src/pages/InventoryControl.tsx', 'utf8');
const modalContent = fs.readFileSync('temp_modal.tsx', 'utf8');

// 1. Remove the original Dialog block at the bottom
content = content.replace(modalContent, '{renderInteractiveChart()}');

// 2. Add the block before `if (!isAdmin)`
const renderBlock = '\n  const renderInteractiveChart = () => (\n' + modalContent + '\n  );\n\n  if (!isAdmin) {';
content = content.replace('  if (!isAdmin) {', renderBlock);

// 3. Add {renderInteractiveChart()} to the non-admin block return JSX
content = content.replace(
  '<RatiosOnlyChart open={isRatiosOnlyModalOpen}',
  '{renderInteractiveChart()}\n        <RatiosOnlyChart open={isRatiosOnlyModalOpen}'
);

// 4. Prevent 'Access Denied' when isDilutionModalOpen is true
content = content.replace(
  '{!isRatiosOnlyModalOpen && (\\n          <div className="flex flex-col items-center">',
  '{!isRatiosOnlyModalOpen && !isDilutionModalOpen && (\n          <div className="flex flex-col items-center">'
);
content = content.replace(
  '{!isRatiosOnlyModalOpen && (\n          <div className="flex flex-col items-center">',
  '{!isRatiosOnlyModalOpen && !isDilutionModalOpen && (\n          <div className="flex flex-col items-center">'
);

fs.writeFileSync('src/pages/InventoryControl.tsx', content);
console.log('Done script!');
