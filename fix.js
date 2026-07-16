const fs = require('fs');
let content = fs.readFileSync('src/pages/InventoryControl.tsx', 'utf8');
const modalContent = fs.readFileSync('temp_modal.tsx', 'utf8');

const renderBlock = '\n  const renderInteractiveChart = () => (\n' + modalContent + '\n  );\n\n  if (!isAdmin) {';

// 1. Replace the if (!isAdmin) { block to include renderInteractiveChart definition and call it inside the non-admin block
content = content.replace('  if (!isAdmin) {', renderBlock);

// 2. Add {renderInteractiveChart()} to the non-admin block return JSX
content = content.replace(
  '<RatiosOnlyChart open={isRatiosOnlyModalOpen}',
  '{renderInteractiveChart()}\n        <RatiosOnlyChart open={isRatiosOnlyModalOpen}'
);

// 3. Prevent 'Access Denied' when isDilutionModalOpen is true
content = content.replace(
  '{!isRatiosOnlyModalOpen && (\n          <div className="flex flex-col items-center">',
  '{!isRatiosOnlyModalOpen && !isDilutionModalOpen && (\n          <div className="flex flex-col items-center">'
);

// 4. Remove the original Dialog block at the bottom
content = content.replace(modalContent, '{renderInteractiveChart()}');

fs.writeFileSync('src/pages/InventoryControl.tsx', content);
console.log('Done!');
