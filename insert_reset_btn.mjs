import { readFileSync, writeFileSync } from 'fs';

const file = 'src/pages/ServiceChecklist.tsx';
let content = readFileSync(file, 'utf8');

const oldPart = '                               <RotateCcw className="h-3 w-3 mr-1" /> Restore\r\n                             </Button>\r\n                             <Button \r\n                               size="sm" \r\n                               variant="ghost" \r\n                               className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 hover:text-red-400"';

const newPart = `                               <RotateCcw className="h-3 w-3 mr-1" /> Restore\r\n                             </Button>\r\n                             <Button \r\n                               size="sm" \r\n                               variant="ghost" \r\n                               className="h-8 w-8 p-0 rounded-full hover:bg-orange-500/20 hover:text-orange-400"\r\n                               title="Reset form — clears checklist for fresh start, keeps this history entry"\r\n                               onClick={() => {\r\n                                 if (confirm("Reset this session? This clears the checklist form for a fresh start. The history entry will remain.")) {\r\n                                   resetForm();\r\n                                   // @ts-ignore\r\n                                   window.currentChecklistSessionId = null;\r\n                                   toast({ title: "Form Reset", description: "Checklist cleared. History record kept." });\r\n                                   window.scrollTo({ top: 0, behavior: "smooth" });\r\n                                 }\r\n                               }}\r\n                             >\r\n                               <RotateCcw className="h-4 w-4" />\r\n                             </Button>\r\n                             <Button \r\n                               size="sm" \r\n                               variant="ghost" \r\n                               className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 hover:text-red-400"`;

if (content.includes(oldPart)) {
  content = content.replace(oldPart, newPart);
  writeFileSync(file, content);
  console.log('SUCCESS: Reset button inserted');
} else {
  console.log('NOT FOUND: String did not match');
}
