import React, { useState } from "react";
import { 
  Calculator, 
  DollarSign, 
  Users, 
  Briefcase, 
  Settings, 
  TrendingUp, 
  Save, 
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { CalculatorTab } from "@/components/compensation/CalculatorTab";
import { EmployeesTab } from "@/components/compensation/EmployeesTab";
import { TemplatesTab } from "@/components/compensation/TemplatesTab";
import { SettingsTab } from "@/components/compensation/SettingsTab";

const CompensationPayroll = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-purple-500" />
            Compensation & Payroll
          </h1>
          <p className="text-zinc-400 mt-1">
            Intelligent compensation management based on Labor Revenue.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-purple-500/20 hover:bg-purple-500/10 text-purple-400">
            <Settings className="w-4 h-4 mr-2" />
            Company Settings
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            <Calculator className="w-4 h-4 mr-2" />
            Live Calculator
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
              Total Payroll (MTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$0.00</div>
            <p className="text-xs text-zinc-500 flex items-center mt-1">
              Awaiting payroll processing
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-blue-400" />
              Avg Labor %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0.0%</div>
            <p className="text-xs text-zinc-500 mt-1">Target: &lt; 35%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <Users className="w-4 h-4 mr-2 text-purple-400" />
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-zinc-500 mt-1">No active payees configured</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid grid-cols-4 lg:w-[600px] bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6 space-y-4">
          <CalculatorTab />
        </TabsContent>

        <TabsContent value="employees" className="mt-6 space-y-4">
          <EmployeesTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-6 space-y-4">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-4">
          <SettingsTab />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default CompensationPayroll;
