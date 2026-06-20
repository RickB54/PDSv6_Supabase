const fs = require('fs');
let p = 'C:/Users/rberu/PDSv6_Supabase/src/pages/StickyNotes.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace('import { Eye, Pin, PinOff, useNavigate } from "react-router-dom";', 'import { useNavigate } from "react-router-dom";');
txt = txt.replace('Search, Settings, Palette, MoreVertical, Copy, ArrowUp, Pin, RefreshCw, Image as ImageIcon,', 'Search, Settings, Palette, MoreVertical, Copy, ArrowUp, Pin, RefreshCw, Image as ImageIcon, Eye, PinOff,');

fs.writeFileSync(p, txt, 'utf8');
