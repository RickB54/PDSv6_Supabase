import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ContactInputProps {
  value: string;
  onChange: (val: string) => void;
  type: 'phone' | 'email';
  placeholder?: string;
  className?: string;
}

const LABELS = {
  phone: ['Personal', 'Work', 'Home', 'Mobile', 'Other'],
  email: ['Personal', 'Work', 'Other']
};

export function ContactInput({ value, onChange, type, placeholder, className }: ContactInputProps) {
  const [currentLabel, setCurrentLabel] = useState<string>('Personal');
  
  // Parse value string into a map
  const contactsMap = useMemo(() => {
    if (!value) return {};
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    const result: Record<string, string> = {};
    for (const part of parts) {
      // Look for format: "value (Label)"
      const match = part.match(/^(.*?)(?:\s*\((.*?)\))?$/);
      if (match) {
        const val = match[1].trim();
        const label = (match[2] || 'Personal').trim();
        if (val) {
          result[label] = val;
        }
      }
    }
    return result;
  }, [value]);

  // When value changes from outside (e.g. initial load), ensure currentLabel is one of the available ones if possible
  useEffect(() => {
    const keys = Object.keys(contactsMap);
    if (keys.length > 0 && !keys.includes(currentLabel) && !contactsMap[currentLabel]) {
      // If the current label has no value, but others do, switch to the first one that has a value
      setCurrentLabel(keys[0]);
    }
  }, [contactsMap]); // Removed currentLabel to avoid unnecessary switches if user just selected an empty label

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const newMap = { ...contactsMap, [currentLabel]: newVal };
    
    // Serialize back to string
    const serialized = Object.entries(newMap)
      .filter(([_, val]) => val && val.trim().length > 0)
      .map(([label, val]) => `${val.trim()} (${label})`)
      .join(', ');
      
    onChange(serialized);
  };

  const currentInputValue = contactsMap[currentLabel] || '';
  
  const options = LABELS[type];

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <Select value={currentLabel} onValueChange={setCurrentLabel}>
        <SelectTrigger className="w-[120px] shrink-0 bg-zinc-900 border-zinc-800 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="hover:bg-zinc-800 focus:bg-zinc-800">
              <div className="flex items-center justify-between w-full pr-2">
                <span>{opt}</span>
                {contactsMap[opt] && <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-2" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={currentInputValue}
        onChange={handleValueChange}
        placeholder={placeholder || (type === 'phone' ? 'Phone Number' : 'Email Address')}
        className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
      />
    </div>
  );
}
