const fs = require('fs');
let content = fs.readFileSync('src/pages/InventoryControl.tsx', 'utf8');

const startTag = '<Dialog open={isDilutionModalOpen} onOpenChange={(val) => {';
const endTag = '</Dialog>';

// Use lastIndexOf because there might be other Dialogs
const startIndex = content.lastIndexOf(startTag);
if (startIndex === -1) throw new Error("Could not find start tag");

// We need the SECOND </Dialog> after startIndex because the modal contains tooltips etc. Wait, does it contain nested <Dialog>s?
// Let's check: The Dialog block itself ends with </Dialog>. Does it have inner </Dialog>? No, it has <DialogContent>, <DialogTitle>. It shouldn't have inner <Dialog>.
// Let's find the </Dialog> that matches.
let endIndex = content.indexOf('</Dialog>', startIndex);
// Wait, is there only one </Dialog> inside? Let's find the exact string `        </DialogContent>\n      </Dialog>`
const exactEnd = '        </DialogContent>\r\n      </Dialog>';
let exactEndIndex = content.indexOf('</Dialog>', startIndex);

// Actually, to be safe, I know the exact block ends just before `<RatiosOnlyChart` which is rendered right after it!
const ratiosChartIndex = content.indexOf('<RatiosOnlyChart \r\n        open={isRatiosOnlyModalOpen}', startIndex);
if (ratiosChartIndex === -1) {
  // Try with \n
  const ratiosChartIndexLF = content.indexOf('<RatiosOnlyChart \n        open={isRatiosOnlyModalOpen}', startIndex);
  if (ratiosChartIndexLF !== -1) {
    endIndex = ratiosChartIndexLF - 1; // back up a bit
  } else {
    // Just find the </Dialog> before RatiosOnlyChart
    const nextRatios = content.indexOf('<RatiosOnlyChart', startIndex);
    const lastDialogBeforeRatios = content.lastIndexOf('</Dialog>', nextRatios);
    endIndex = lastDialogBeforeRatios + '</Dialog>'.length;
  }
} else {
    const lastDialogBeforeRatios = content.lastIndexOf('</Dialog>', ratiosChartIndex);
    endIndex = lastDialogBeforeRatios + '</Dialog>'.length;
}

const modalContent = content.substring(startIndex, endIndex);

// 1. Remove the original Dialog block at the bottom
content = content.substring(0, startIndex) + '{renderInteractiveChart()}\n      ' + content.substring(endIndex);

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
  '{!isRatiosOnlyModalOpen && (\r\n          <div className="flex flex-col items-center">',
  '{!isRatiosOnlyModalOpen && !isDilutionModalOpen && (\r\n          <div className="flex flex-col items-center">'
);
content = content.replace(
  '{!isRatiosOnlyModalOpen && (\n          <div className="flex flex-col items-center">',
  '{!isRatiosOnlyModalOpen && !isDilutionModalOpen && (\n          <div className="flex flex-col items-center">'
);

fs.writeFileSync('src/pages/InventoryControl.tsx', content);
console.log('Done script!');
