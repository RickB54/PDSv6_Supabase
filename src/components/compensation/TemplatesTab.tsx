import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Shield, Zap, Wrench, Star } from "lucide-react";

const TEMPLATES = [
  {
    id: 1,
    name: "Lead Detail Technician",
    description: "Highly skilled, works independently, produces premium quality.",
    range: "35–45% of Labor Revenue",
    icon: Star,
    color: "text-amber-400",
    bg: "bg-amber-400/10"
  },
  {
    id: 2,
    name: "Standard Detail Technician",
    description: "Performs detailing work but relies completely on company equipment & management.",
    range: "25–35% of Labor Revenue",
    icon: Wrench,
    color: "text-blue-400",
    bg: "bg-blue-400/10"
  },
  {
    id: 3,
    name: "Independent Contractor",
    description: "Provides own equipment, may carry insurance, operates with independence.",
    range: "45–60% of Labor Revenue",
    icon: Zap,
    color: "text-purple-400",
    bg: "bg-purple-400/10"
  },
  {
    id: 4,
    name: "Shop Manager",
    description: "Oversees daily operations, quality control, and staff management.",
    range: "Salary + Performance Bonus",
    icon: Shield,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10"
  }
];

export const TemplatesTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Compensation Templates</h2>
          <p className="text-zinc-400">Standardized compensation ranges for different employee classifications.</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <Card key={tpl.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${tpl.bg}`}>
                    <Icon className={`w-6 h-6 ${tpl.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white">{tpl.name}</CardTitle>
                    <div className="text-sm font-bold text-emerald-400 mt-1">{tpl.range}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <CardDescription className="text-zinc-400 leading-relaxed">
                  {tpl.description}
                </CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
};
