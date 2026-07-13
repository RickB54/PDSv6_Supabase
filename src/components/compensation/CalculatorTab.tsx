import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";

export const CalculatorTab = () => {
  const [jobPrice, setJobPrice] = useState(350);
  const [materials, setMaterials] = useState(35);
  const [consumables, setConsumables] = useState(10);
  const [stripeFee, setStripeFee] = useState(11.35); // Approx 2.9% + 30c
  const [employeeStripeShare, setEmployeeStripeShare] = useState(50); // percentage
  const [otherCosts, setOtherCosts] = useState(15);
  
  const [employeeType, setEmployeeType] = useState("lead");
  const [commissionPercent, setCommissionPercent] = useState(40);

  // Derived values
  const effectiveStripeDeduction = stripeFee * (employeeStripeShare / 100);
  const totalDeductions = materials + consumables + otherCosts + effectiveStripeDeduction;
  const laborRevenue = Math.max(0, jobPrice - totalDeductions);
  const employeePay = laborRevenue * (commissionPercent / 100);
  const companyKeeps = jobPrice - totalDeductions - employeePay; // Note: company actually pays full stripe fee, so let's be precise:
  
  // Real company profit calculation:
  // Company Revenue = Job Price
  // Company Expenses = Materials + Consumables + Other + FULL Stripe Fee + Employee Pay
  // Employee Pay = (Job Price - Materials - Consumables - Other - (Stripe Fee * Share)) * Commission%
  
  const companyProfit = jobPrice - (materials + consumables + otherCosts + stripeFee) - employeePay;
  const profitMargin = jobPrice > 0 ? (companyProfit / jobPrice) * 100 : 0;
  
  const getRecommendedRange = (type: string) => {
    switch (type) {
      case "standard": return "25% - 35%";
      case "lead": return "35% - 45%";
      case "independent": return "45% - 60%";
      default: return "N/A";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-xl text-white">Job Details & Deductions</CardTitle>
            <CardDescription>Enter the job price and direct costs to determine Labor Revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Total Customer Price ($)</Label>
              <Input 
                type="number" 
                value={jobPrice} 
                onChange={(e) => setJobPrice(Number(e.target.value))}
                className="bg-zinc-950 border-zinc-800 text-white text-lg h-12"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Materials & Chemicals</Label>
                <Input type="number" value={materials} onChange={(e) => setMaterials(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Consumables & Shop</Label>
                <Input type="number" value={consumables} onChange={(e) => setConsumables(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Other Direct Costs</Label>
                <Input type="number" value={otherCosts} onChange={(e) => setOtherCosts(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Stripe Processing Fee</Label>
                <Input type="number" value={stripeFee} onChange={(e) => setStripeFee(Number(e.target.value))} className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center">
                <Label className="text-zinc-300">Employee Stripe Fee Share</Label>
                <span className="text-purple-400 font-bold">{employeeStripeShare}%</span>
              </div>
              <Slider 
                value={[employeeStripeShare]} 
                onValueChange={(val) => setEmployeeStripeShare(val[0])} 
                max={100} 
                step={25} 
                className="py-4"
              />
              <p className="text-xs text-zinc-500">
                Employee absorbs ${effectiveStripeDeduction.toFixed(2)} of the processing fee before commission.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-xl text-white">Employee Compensation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Employee Type</Label>
              <Select value={employeeType} onValueChange={setEmployeeType}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="standard">Standard Detail Technician</SelectItem>
                  <SelectItem value="lead">Lead Detail Technician</SelectItem>
                  <SelectItem value="independent">Independent Contractor</SelectItem>
                  <SelectItem value="manager">Shop Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <Label className="text-zinc-300">Commission Percentage</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-purple-400 border-purple-500/20 bg-purple-500/10">
                    Rec: {getRecommendedRange(employeeType)}
                  </Badge>
                  <span className="text-xl font-bold text-white">{commissionPercent}%</span>
                </div>
              </div>
              <Slider 
                value={[commissionPercent]} 
                onValueChange={(val) => setCommissionPercent(val[0])} 
                max={100} 
                step={1} 
                className="py-4"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-zinc-900 border-zinc-800 h-full">
          <CardHeader>
            <CardTitle className="text-xl text-white flex justify-between items-center">
              Result Summary
              {profitMargin < 30 && (
                <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Low Profit Margin
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex justify-between text-zinc-400">
                <span>Customer Pays</span>
                <span className="text-white">${jobPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Deductions</span>
                <span className="text-red-400">-${totalDeductions.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-lg">
                <span className="text-zinc-300">Labor Revenue</span>
                <span className="text-blue-400">${laborRevenue.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-purple-900/20 border border-purple-500/30 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24" />
              </div>
              <p className="text-purple-300 font-medium">Employee Earnings</p>
              <h2 className="text-5xl font-black text-white">${employeePay.toFixed(2)}</h2>
              <p className="text-sm text-purple-400/80">Based on {commissionPercent}% of Labor Revenue</p>
            </div>

            <div className="p-6 rounded-lg bg-emerald-900/10 border border-emerald-500/20 space-y-2">
              <p className="text-emerald-400/80 font-medium">Company Gross Profit</p>
              <div className="flex items-end justify-between">
                <h2 className="text-4xl font-black text-emerald-400">${companyProfit.toFixed(2)}</h2>
                <span className="text-xl font-bold text-emerald-500/50 mb-1">{profitMargin.toFixed(1)}% margin</span>
              </div>
              <p className="text-xs text-zinc-500 pt-2 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Company profit is what remains to cover marketing, rent, insurance, and equipment depreciation.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};
