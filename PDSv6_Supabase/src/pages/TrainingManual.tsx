import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const TrainingManual = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Quick Detailing Manual" />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="p-6 bg-gradient-card border-border animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Quick Detailing Manual</h1>
              <p className="text-muted-foreground">Complete Interior & Exterior Process + Product & Equipment Guides</p>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded shadow-lg transition-transform hover:scale-105 active:scale-95">
              Rick's Pro Tips
            </button>
          </div>

          <Tabs defaultValue="hardware" className="w-full space-y-6">
            <TabsList className="flex flex-wrap h-auto w-full gap-2 justify-start md:justify-center bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
              <TabsTrigger value="hardware" className="flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Hardware & Tools</TabsTrigger>
              <TabsTrigger value="chemicals" className="flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chemicals & Safety</TabsTrigger>
              <TabsTrigger value="process" className="flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Detailing Process</TabsTrigger>
              <TabsTrigger value="mobile" className="flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mobile Setup</TabsTrigger>
            </TabsList>

            {/* HARDWARE SECTION */}
            <TabsContent value="hardware" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <ScrollArea className="h-[65vh] pr-4">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-primary/30 pb-2">
                      <h3 className="text-2xl font-bold text-primary">Essential Hardware</h3>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full border border-primary/30">Core Equipment</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: "Pressure Washer", spec: "1,600–2,000 PSI / 1.2–1.4 GPM", use: "Rinsing, Foam Cannon", tip: "Use 40° (White) or 25° (Green) nozzle. Never use 0° (Red) on paint!" },
                        { name: "Foam Cannon", spec: "Wide neck, adjustable fan", use: "Pre-soak", tip: "Mix soap with warm water for thicker foam. Adjust knob to max negative." },
                        { name: "DA Polisher", spec: "Random Orbital (8mm–15mm throw)", use: "Correction & Wax", tip: "Keep pad flat. let the machine do the work. Don't press too hard." },
                        { name: "Shop Vac", spec: "5+ HP Peak", use: "Interior Extraction", tip: "Clean filter daily. Use crevice tool for sliding rails." },
                        { name: "Air Compressor", spec: "110+ PSI", use: "Blowing out crevices", tip: "Wrap nozzle tip in tape to prevent accidental scratches." },
                        { name: "Extension Cords", spec: "12 Gauge Heavy Duty", use: "Powering tools", tip: "Fully unwind before use to prevent overheating." },
                      ].map((item, i) => (
                        <div key={i} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all">
                          <h4 className="font-bold text-lg text-white">{item.name}</h4>
                          <p className="text-sm text-zinc-400 font-mono mb-2">{item.spec}</p>
                          <p className="text-sm text-zinc-300 mb-2"><strong>Use:</strong> {item.use}</p>
                          <div className="bg-blue-500/10 text-blue-300 text-xs p-2 rounded border border-blue-500/20">
                            <strong>Pro Tip:</strong> {item.tip}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-orange-500/30 pb-2">
                      <h3 className="text-2xl font-bold text-orange-500">Manual Tools</h3>
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/30">Hand Tools</span>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 list-disc pl-5 text-zinc-300">
                      <li><strong>Microfiber Mitts:</strong> Use chenille for wheels, plush microfiber for paint. Wash often.</li>
                      <li><strong>Wheel Brushes:</strong> Barrel brush (Ez-Detail) + Boar's hair for face.</li>
                      <li><strong>Detailing Brushes:</strong> Soft synthetic for emblems/interior, stiff for lug nuts.</li>
                      <li><strong>Clay Bar/Mitt:</strong> Fine grade for maintenance, Medium for correction. Use lots of lube.</li>
                      <li><strong>Drying Towel:</strong> Twisted loop (Gauntlet/Liquid8r) absorbs usually 1 pass.</li>
                      <li><strong>Pet Hair Stone:</strong> Use on carpet only. Never on plastic or leather.</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* CHEMICALS SECTION */}
            <TabsContent value="chemicals" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <ScrollArea className="h-[65vh] pr-4">
                <div className="space-y-8">
                  {/* Safety First */}
                  <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl">
                    <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">⚠️ Critical Safety Warning</h3>
                    <p className="text-zinc-300 text-sm mb-2">
                      Chemicals can cause permanent damage to you and the vehicle if misused.
                    </p>
                    <ul className="text-sm text-red-300 list-disc pl-5 space-y-1">
                      <li><strong>PPE:</strong> Always wear nitrile gloves and eye protection (especially with acids/alkalines).</li>
                      <li><strong>Never mix products:</strong> Ammonia + Bleach = Deadly Gas.</li>
                      <li><strong>Hot Surfaces:</strong> never spray chemicals on hot paint or wheels. It will etch instantly.</li>
                    </ul>
                  </div>

                  {/* Exterior Chems */}
                  <div>
                    <h3 className="text-2xl font-bold text-primary mb-4 border-b border-zinc-800 pb-2">Exterior Chemistry</h3>
                    <div className="space-y-4">
                      {[
                        { name: "Car Shampoo", type: "pH Neutral", dilution: "1-2oz per bucket", note: "Lubricity is key. Don't let dry." },
                        { name: "Wheel Cleaner", type: "Acid/Alkaline/Iron", dilution: "Ready to Use or 4:1", note: "Acid for heavy dust (careful!), Iron remover for safe bleeding effect." },
                        { name: "APC (All Purpose)", type: "Alkaline", dilution: "4:1 (Tires/Wells), 10:1 (Delicate)", note: "Strips wax. Great for bugs and lower panels." },
                        { name: "Iron Remover", type: "Decon", dilution: "Ready to Use", note: "Smells like sulfur. Dissolves embedded metal particles. Purple runoff." },
                        { name: "Quick Detailer", type: "Lubricant", dilution: "Ready to Use", note: "For clay lube or removing drying spots." },
                      ].map((c, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900/30 p-3 rounded-lg border border-zinc-800">
                          <div>
                            <span className="font-bold text-white text-lg">{c.name}</span>
                            <span className="text-xs text-zinc-500 ml-2">({c.type})</span>
                          </div>
                          <div className="text-right mt-2 md:mt-0">
                            <div className="text-sm text-primary font-mono">{c.dilution}</div>
                            <div className="text-xs text-zinc-400">{c.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interior Chems */}
                  <div>
                    <h3 className="text-2xl font-bold text-purple-400 mb-4 border-b border-zinc-800 pb-2">Interior Chemistry</h3>
                    <div className="space-y-4">
                      {[
                        { name: "Interior Cleaner (P&S Xpress)", type: "Mild Cleaner", dilution: "1:1 or Ready", note: "Safe on leather, vinyl, plastic. Agitate with brush." },
                        { name: "Glass Cleaner", type: "Alcohol Based", dilution: "10:1 or Ready", note: "AMMONIA FREE ONLY for tinted windows. Two towel method." },
                        { name: "Carpet Bomber", type: "Enzyme/Solvent", dilution: "Ready to Use", note: "Breaks down proteins/grease. Drill brush agitation essential." },
                        { name: "Dressing (303 Aerospace)", type: "UV Protectant", dilution: "Ready to Use", note: "Matte finish. Do not use oily dressings on dash (glare hazard)." },
                      ].map((c, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900/30 p-3 rounded-lg border border-zinc-800">
                          <div>
                            <span className="font-bold text-purple-200 text-lg">{c.name}</span>
                            <span className="text-xs text-zinc-500 ml-2">({c.type})</span>
                          </div>
                          <div className="text-right mt-2 md:mt-0">
                            <div className="text-sm text-purple-400 font-mono">{c.dilution}</div>
                            <div className="text-xs text-zinc-400">{c.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* PROCESS SECTION */}
            <TabsContent value="process" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <ScrollArea className="h-[65vh] pr-4">
                <div className="space-y-8">
                  {/* Workflow Timeline */}
                  <div className="relative pl-6 border-l-2 border-zinc-700 space-y-10 py-2">
                    {[
                      {
                        step: 1, title: "Wheels & Tires First",
                        desc: "Always start here. Used heavily contaminated brushes. Clean barrel -> Face -> Lug nuts -> Tire wall. Rinse thoroughly.",
                        alert: "Don't let cleaner dry on hot wheels."
                      },
                      {
                        step: 2, title: "Pre-Wash & Foam",
                        desc: "Rinse loose dirt. Apply foam. Agitate emblems/grilles with soft brush while foamed. Rinse.",
                        alert: "Removes 90% of dirt before you touch paint."
                      },
                      {
                        step: 3, title: "Contact Wash (2 Bucket)",
                        desc: "Top down. Roof -> Glass -> Hood -> Sides -> Lower Panels. Rinse wash mitt in clean water bucket after every panel.",
                        alert: "Save lower rocker panels for last (dirtiest)."
                      },
                      {
                        step: 4, title: "Chemical Decon (Iron/Tar)",
                        desc: "Spray Iron Remover on wet paint. Let turn purple (3 min). Rinse. Apply Tar remover if needed.",
                        alert: "Do not do this in direct sun."
                      },
                      {
                        step: 5, title: "Mechanical Decon (Clay)",
                        desc: "Use lubricant (clay lube or soapy water). Light pressure. Put hand in plastic bag to feel smoothness.",
                        alert: "If you drop the clay, THROW IT AWAY."
                      },
                      {
                        step: 6, title: "Dry & blow",
                        desc: "Use drying aid (spray wax) to lube towel. Blow out side mirrors, handles, and grille with air.",
                        alert: "Water drips ruin the finish later."
                      },
                      {
                        step: 7, title: "Protection (Wax/Sealant)",
                        desc: "Apply machine wax or hand sealant. Crosshatch pattern for coverage. Buff off with clean plush towel.",
                        alert: "Avoid getting wax on black plastic trim (stains white)."
                      },
                      {
                        step: 8, title: "Interior Deep Clean",
                        desc: "Trash -> Vacuum -> Shampoo -> Steam -> Plastics -> Glass. Work Top to Bottom.",
                        alert: "Clean glass last to remove overspray from protectants."
                      }
                    ].map((s, i) => (
                      <div key={s.step} className="relative">
                        <span className="absolute -left-[2.1rem] top-0 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-600 font-bold text-sm text-foreground">
                          {s.step}
                        </span>
                        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                          <h4 className="text-xl font-bold text-foreground mb-2">{s.title}</h4>
                          <p className="text-zinc-300 mb-2">{s.desc}</p>
                          {s.alert && (
                            <p className="text-xs text-orange-400 font-semibold bg-orange-950/20 p-2 rounded inline-block">
                              ⚠️ {s.alert}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quality Control Checklist */}
                  <div className="bg-green-950/20 border border-green-900 p-4 rounded-xl">
                    <h3 className="text-xl font-bold text-green-500 mb-3">Final QC Checklist</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-zinc-300">
                      <li className="flex items-center gap-2">✅ Door jambs wiped dry?</li>
                      <li className="flex items-center gap-2">✅ Windows rolled down slightly to clean top edge?</li>
                      <li className="flex items-center gap-2">✅ No wax residue on trim?</li>
                      <li className="flex items-center gap-2">✅ Wheels rotated 180° to check missed spots?</li>
                      <li className="flex items-center gap-2">✅ Gas cap door cleaned?</li>
                      <li className="flex items-center gap-2">✅ Seats fully dry?</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* MOBILE SETUP SECTION */}
            <TabsContent value="mobile" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <ScrollArea className="h-[65vh] pr-4">
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <h3 className="text-2xl font-bold text-primary">Truck Bed Organization</h3>
                      <p className="text-muted-foreground">Efficiency is money. Minimize steps between your truck and the customer car.</p>

                      <div className="space-y-3">
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                          <span className="text-blue-400 font-bold block mb-1">Zone 1: Rear (Tailgate)</span>
                          <p className="text-sm text-zinc-400">Items you grab immediately. Buckets, Pressure Washer Hose Reel, Extension Cord, Chemicals Rack.</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                          <span className="text-blue-400 font-bold block mb-1">Zone 2: Middle</span>
                          <p className="text-sm text-zinc-400">Heavy equipment. Generator (Exhaust pointing OUT), Pressure Washer unit, Air Compressor.</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                          <span className="text-blue-400 font-bold block mb-1">Zone 3: Front (Cab)</span>
                          <p className="text-sm text-zinc-400">Water Tank (Center for weight distribution), Bulk refills, seldom used tools.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        Client Arrival Script
                      </h3>
                      <div className="space-y-4 text-sm text-zinc-300 font-mono bg-black/20 p-4 rounded border border-zinc-800/50">
                        <p className="text-green-400">"Hi [Client Name], I'm [Name] from Prime Detail."</p>
                        <p>"I'm just pulling up now. I'll need access to an electrical outlet within 100ft if possible (if no generator)."</p>
                        <p>"Before I start, are there any specific areas of concern you want me to focus on today?"</p>
                        <p className="text-zinc-500 italic">...Perform pre-inspection walkaround with client...</p>
                        <p>"Looks like we have some [scratch/stain]. I'll do my best to improve that but it might require [Upsell Service]."</p>
                        <p>"I'll get started. It should take about [Time]. I'll text you 15 mins before I finish."</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                      <h4 className="font-bold text-white mb-2">Power Management</h4>
                      <ul className="text-sm text-zinc-400 list-disc pl-5 space-y-1">
                        <li>Start generator <strong>before</strong> plugging in load.</li>
                        <li>Don't run Steamer and Vacuum simultaneously on one circuit (trips breaker).</li>
                        <li>Turn off generator fuel valve when traveling to prevent flooding carb.</li>
                      </ul>
                    </div>
                    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                      <h4 className="font-bold text-white mb-2">Water Management</h4>
                      <ul className="text-sm text-zinc-400 list-disc pl-5 space-y-1">
                        <li>Fill tank every night. 50 Gal = ~2-3 Cars.</li>
                        <li>Check pump filter screen weekly for algae.</li>
                        <li>Release pressure from hose gun after turning off pump (prevents leaks).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
};

export default TrainingManual;
