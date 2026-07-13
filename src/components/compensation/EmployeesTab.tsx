import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Star, Shield, Activity, TrendingUp, Sparkles, BrainCircuit, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DUMMY_EMPLOYEES: any[] = [];

export const EmployeesTab = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(DUMMY_EMPLOYEES[0]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Employee List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Team Members</h2>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
        
        <div className="space-y-2">
          {DUMMY_EMPLOYEES.length === 0 && (
            <div className="p-4 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
              No employees added yet.
            </div>
          )}
          {DUMMY_EMPLOYEES.map((emp) => (
            <Card 
              key={emp.id} 
              className={`cursor-pointer transition-colors ${selectedEmployee?.id === emp.id ? 'bg-purple-900/20 border-purple-500/50' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
              onClick={() => setSelectedEmployee(emp)}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{emp.name}</div>
                  <div className="text-xs text-zinc-400">{emp.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-purple-400">{emp.rate}</div>
                  <Badge variant="outline" className="mt-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    Score: {emp.score}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Column: Profile & Settings */}
      <div className="lg:col-span-2 space-y-6">
        {!selectedEmployee ? (
          <Card className="bg-zinc-900 border-zinc-800 h-full min-h-[400px] flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select an employee to view or edit their compensation profile.</p>
            </div>
          </Card>
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-4 border-b border-zinc-800">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-white">{selectedEmployee.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">{selectedEmployee.type}</Badge>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">Current Method: <strong className="text-zinc-300">{selectedEmployee.method}</strong></span>
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                      <BrainCircuit className="w-4 h-4 mr-2" />
                      AI Assessment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center text-xl gap-2 text-purple-400">
                        <Sparkles className="w-5 h-5" />
                        Smart Recommendation Engine
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <p className="text-zinc-400">Based on recent performance data, customer reviews, and efficiency metrics, the AI recommends the following compensation adjustments for {selectedEmployee.name}:</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-zinc-900 border-emerald-500/30">
                          <CardContent className="p-4 space-y-1">
                            <p className="text-sm text-zinc-400">Suggested Pay %</p>
                            <p className="text-2xl font-bold text-emerald-400">42%</p>
                            <p className="text-xs text-emerald-500/80">Currently 40%</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-zinc-900 border-purple-500/30">
                          <CardContent className="p-4 space-y-1">
                            <p className="text-sm text-zinc-400">Performance Bonus</p>
                            <p className="text-2xl font-bold text-purple-400">$350</p>
                            <p className="text-xs text-purple-500/80">High up-sell rate</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 space-y-2">
                        <h4 className="font-medium text-white mb-2">Skill Assessment Highlights</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Paint Correction</span>
                          <span className="text-emerald-400">Expert (95%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Efficiency</span>
                          <span className="text-emerald-400">High (1.2x avg)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Customer Satisfaction</span>
                          <span className="text-blue-400">4.9/5.0</span>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Compensation Structure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Payment Method</label>
                    <Select defaultValue="labor_percentage">
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="per_job">Per Job (Recommended)</SelectItem>
                        <SelectItem value="salary">Salary + Bonus</SelectItem>
                        <SelectItem value="labor_percentage">Labor Percentage</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Base Rate / Percentage</label>
                    <Input type="text" defaultValue="40" className="bg-zinc-950 border-zinc-800 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-lg font-medium text-white">Per-Job Fixed Overrides (Optional)</h3>
                <p className="text-sm text-zinc-400">If using Per Job or Hybrid, you can set specific payouts for services.</p>
                
                <Table>
                  <TableHeader className="bg-zinc-950">
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Service</TableHead>
                      <TableHead className="text-zinc-400">Payout Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-white">Full Detail</TableCell>
                      <TableCell><Input type="number" defaultValue="150" className="w-24 bg-zinc-950 border-zinc-800 text-white h-8" /></TableCell>
                    </TableRow>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-white">Ceramic Coating</TableCell>
                      <TableCell><Input type="number" defaultValue="400" className="w-24 bg-zinc-950 border-zinc-800 text-white h-8" /></TableCell>
                    </TableRow>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-white">Paint Correction</TableCell>
                      <TableCell><Input type="number" defaultValue="250" className="w-24 bg-zinc-950 border-zinc-800 text-white h-8" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">Save Compensation Profile</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
