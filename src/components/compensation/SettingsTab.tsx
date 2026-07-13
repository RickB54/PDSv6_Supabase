import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-white">Company Operating Costs</CardTitle>
          <CardDescription>
            These settings help calculate accurate profitability recommendations. Enter your average monthly costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Facilities & Ops</h3>
              <div className="space-y-2">
                <Label className="text-zinc-400">Rent / Lease</Label>
                <Input type="number" defaultValue="2500" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Utilities (Water, Elec)</Label>
                <Input type="number" defaultValue="350" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Insurance</Label>
                <Input type="number" defaultValue="450" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Marketing & Software</h3>
              <div className="space-y-2">
                <Label className="text-zinc-400">Advertising (Ads, SEO)</Label>
                <Input type="number" defaultValue="800" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">CRM & Software Subs</Label>
                <Input type="number" defaultValue="150" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Website & Hosting</Label>
                <Input type="number" defaultValue="50" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Equipment & Supply</h3>
              <div className="space-y-2">
                <Label className="text-zinc-400">Equipment Depreciation</Label>
                <Input type="number" defaultValue="300" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Vehicle Fuel & Maint</Label>
                <Input type="number" defaultValue="400" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Average Monthly Materials</Label>
                <Input type="number" defaultValue="600" className="bg-zinc-950 border-zinc-800 text-white" />
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-zinc-800 flex justify-end">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Save Company Settings</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-white">Profit Targets</CardTitle>
          <CardDescription>
            Set your business goals to trigger Profit Protection warnings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-zinc-400">Minimum Gross Margin (%)</Label>
            <Input type="number" defaultValue="45" className="bg-zinc-950 border-zinc-800 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">Target Payroll %</Label>
            <Input type="number" defaultValue="35" className="bg-zinc-950 border-zinc-800 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">Default Employee Stripe Share (%)</Label>
            <Input type="number" defaultValue="50" className="bg-zinc-950 border-zinc-800 text-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
