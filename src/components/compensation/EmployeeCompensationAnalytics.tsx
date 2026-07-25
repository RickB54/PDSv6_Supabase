import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";

export const EmployeeCompensationAnalytics = ({ bookings, employees }: { bookings: any[], employees: any[] }) => {
  const payrollTrendData: any[] = [];
  const compensationTypeData: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-purple-500" />
            Employee Compensation Analytics
          </h2>
          <p className="text-zinc-400">Track compensation efficiency, labor revenue generated, and compensation trends.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
              Total Compensation YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$0.00</div>
            <p className="text-xs text-zinc-500 mt-1">Awaiting compensation data</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-400" />
              Labor Revenue Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$0.00</div>
            <p className="text-xs text-zinc-500 mt-1">Awaiting revenue data</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-purple-400" />
              Avg Revenue per Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">$0/hr</div>
            <p className="text-xs text-zinc-500 mt-1">Across all employees</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center">
              <Users className="w-4 h-4 mr-2 text-amber-400" />
              Active Payees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-zinc-500 mt-1">No active payees configured</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Compensation vs Labor Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <RechartsTooltip 
                  cursor={{fill: '#27272a', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="payroll" name="Compensation" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Labor Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Compensation by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compensationTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {compensationTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Employee Profitability Leaderboard */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-white">Employee Profitability Leaderboard</CardTitle>
          <CardDescription>Compare generated revenue vs compensation paid.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
              No employee profitability data available.
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
