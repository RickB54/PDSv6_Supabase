const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf8');

content = content.replace(/await executeVisualReport\(type,\s*undefined,\s*undefined,\s*true\);/g, 'setPendingReportConfig({ type, start: undefined, end: undefined, preserveFilters: true });\n            setReportSelectionModalOpen(true);');

content = content.replace(/executeVisualReport\(reportExportType,\s*customReportDateFilter\.start,\s*customReportDateFilter\.end\);/g, 'setPendingReportConfig({ type: reportExportType, start: customReportDateFilter.start, end: customReportDateFilter.end, preserveFilters: false });\n                                    setReportSelectionModalOpen(true);');

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
