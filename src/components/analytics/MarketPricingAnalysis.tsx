import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import localforage from 'localforage';
import { servicePackages as builtInPackages, addOns as builtInAddOns } from '@/lib/services';
import { getPackageMeta, getAddOnMeta, getCustomPackages, getCustomAddOns } from '@/lib/servicesMeta';

const vehicleOptions = ['compact', 'midsize', 'truck', 'luxury'];
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const getMarketAverage = (name: string, size: string, isPackage: boolean): number => {
  const n = name.toLowerCase();
  let base = 50;
  if (isPackage) {
    if (n.includes('essential') && n.includes('full')) base = 250;
    else if (n.includes('essential') && n.includes('interior')) base = 150;
    else if (n.includes('essential') && n.includes('exterior')) base = 80;
    else if (n.includes('elite') && n.includes('full')) base = 480;
    else if (n.includes('elite') && n.includes('interior')) base = 350;
    else if (n.includes('elite') && n.includes('exterior')) base = 150;
    else if (n.includes('premium') || n.includes('exterior')) base = 120;
    else if (n.includes('full detail')) base = 250;
    else base = 100;
  } else {
    if (n.includes('wheel')) base = 35;
    else if (n.includes('clay')) base = 90;
    else if (n.includes('headlight')) base = 125;
    else if (n.includes('leather')) base = 60;
    else if (n.includes('trim')) base = 80;
    else if (n.includes('engine')) base = 100;
    else if (n.includes('pet')) base = 80;
    else if (n.includes('stain')) base = 75;
    else if (n.includes('scratch')) base = 250;
    else if (n.includes('deep interior')) base = 180;
    else if (n.includes('sealant')) base = 100;
    else if (n.includes('touch-up')) base = 85;
    else if (n.includes('ceramic coating') && !n.includes('1-year') && !n.includes('2-year')) base = 600;
    else if (n.includes('1-year')) base = 150;
    else if (n.includes('2-year')) base = 400;
    else if (n.includes('correction')) base = 400;
    else if (n.includes('odor')) base = 100;
    else base = 60;
  }
  let multiplier = 1;
  if (size === 'midsize') multiplier = 1.15;
  if (size === 'truck') multiplier = 1.35;
  if (size === 'luxury') multiplier = 1.6;
  return Math.round(base * multiplier);
};

export default function MarketPricingAnalysis({ initialCategory = 'packages' }: { initialCategory?: 'packages' | 'addons' }) {
  const [category, setCategory] = useState<'packages' | 'addons'>(initialCategory);
  const [vehicleClass, setVehicleClass] = useState<string>('compact');
  const [showArchived, setShowArchived] = useState(false);
  const [savedPrices, setSavedPrices] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    const data = await localforage.getItem<Record<string, string>>('savedPrices');
    if (data) setSavedPrices(data);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const data = useMemo(() => {
    const pkgs = [...builtInPackages, ...getCustomPackages()].filter(p => showArchived ? !getPackageMeta(p.id)?.deleted : (getPackageMeta(p.id)?.visible !== false && !getPackageMeta(p.id)?.deleted));
    const addons = [...builtInAddOns, ...getCustomAddOns()].filter(a => showArchived ? !getAddOnMeta(a.id)?.deleted : (getAddOnMeta(a.id)?.visible !== false && !getAddOnMeta(a.id)?.deleted));
    
    const items = category === 'packages' ? pkgs : addons;
    
    return items.map(item => {
      const key = `${category === 'packages' ? 'package' : 'addon'}:${item.id}:${vehicleClass}`;
      let myPrice = parseFloat(savedPrices[key]);
      if (isNaN(myPrice)) {
        myPrice = (item as any).pricing?.[vehicleClass] || 0;
      }
      
      const mktPrice = getMarketAverage(item.name, vehicleClass, category === 'packages');
      
      const wNorth = Math.round(mktPrice * 1.10);
      const wSouth = Math.round(mktPrice * 1.25);
      const mNorth = Math.round(mktPrice * 0.85);
      const mSouth = Math.round(mktPrice * 0.90);
      const eNorth = Math.round(mktPrice * 1.05);
      const eSouth = Math.round(mktPrice * 0.95);

      // Shorten name for chart X-axis
      let shortName = item.name;
      if (shortName.length > 20) shortName = shortName.substring(0, 18) + '...';

      return {
        name: shortName,
        fullName: item.name,
        "Prime Auto": myPrice,
        "Methuen Avg": mktPrice,
        "West North": wNorth,
        "West South": wSouth,
        "Mid North": mNorth,
        "Mid South": mSouth,
        "East North": eNorth,
        "East South": eSouth,
        difference: myPrice - mktPrice,
        isHigher: myPrice > mktPrice
      };
    });
  }, [category, vehicleClass, savedPrices, showArchived]);

  const avgDiff = data.reduce((acc, curr) => acc + curr.difference, 0) / (data.length || 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Local Market Pricing Analysis (Methuen, MA Area)</h3>
          <p className="text-xs sm:text-sm text-zinc-400">Comparing your active rates vs Methuen, MA Area averages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2 mr-1 sm:mr-4">
            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="show-archived" className="text-xs sm:text-sm text-zinc-400 cursor-pointer whitespace-nowrap">Show Archived</Label>
          </div>
          <Select value={category} onValueChange={(val: any) => setCategory(val)}>
            <SelectTrigger className="w-[115px] sm:w-[150px] h-9 text-xs sm:text-sm bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="z-[10005]">
              <SelectItem value="packages">Packages</SelectItem>
              <SelectItem value="addons">Add-Ons</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vehicleClass} onValueChange={setVehicleClass}>
            <SelectTrigger className="w-[115px] sm:w-[150px] h-9 text-xs sm:text-sm bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Vehicle Class" />
            </SelectTrigger>
            <SelectContent className="z-[10005]">
              {vehicleOptions.map(v => (
                <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} disabled={isRefreshing} className="h-9 w-9 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 shrink-0">
            <RotateCcw className={`h-4 w-4 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Pricing Strategy</div>
          <div className={`text-2xl font-black ${avgDiff > 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
            {avgDiff > 0 ? 'Premium Tier' : 'Value Tier'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Based on current vs market avg</div>
        </Card>
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Items Tracked</div>
          <div className="text-2xl font-black text-white">{data.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Active {category} only</div>
        </Card>
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <div className="text-sm text-zinc-400 mb-1">Average Variance</div>
          <div className={`text-2xl font-black ${avgDiff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {avgDiff > 0 ? '+' : (avgDiff < 0 ? '-' : '')}${Math.abs(Math.round(avgDiff))}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Difference per item</div>
        </Card>
      </div>

      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h4 className="text-lg font-bold text-white mb-6">Price Comparison Graph (Methuen, MA Area)</h4>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#888', fontSize: 11 }} 
                interval={0} 
                angle={-45} 
                textAnchor="end"
              />
              <YAxis 
                tick={{ fill: '#888' }} 
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#2a2a2a' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [`$${value}`, name]}
                labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar dataKey="Methuen Avg" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Market Avg" />
              <Bar dataKey="Prime Auto" fill="#ef4444" radius={[4, 4, 0, 0]} name="Your Price" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6 bg-zinc-900 border-zinc-800">
        <h4 className="text-lg font-bold text-white mb-6">Price Comparison by US Region</h4>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#888', fontSize: 11 }} 
                interval={0} 
                angle={-45} 
                textAnchor="end"
              />
              <YAxis 
                tick={{ fill: '#888' }} 
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#2a2a2a' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [`$${value}`, name]}
                labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar dataKey="West North" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="West South" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mid North" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mid South" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="East North" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="East South" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
