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
          <h1 className="text-3xl font-bold text-foreground mb-2">Quick Detailing Manual</h1>
          <p className="text-muted-foreground mb-6">Complete Interior & Exterior Process + Product & Equipment Guides</p>

          <Tabs defaultValue="hardware" className="w-full">
<TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <TabsTrigger value="hardware">Hardware</TabsTrigger>
              <TabsTrigger value="chemicals">Chemicals</TabsTrigger>
              <TabsTrigger value="process">Process</TabsTrigger>
              <TabsTrigger value="mobile">Mobile Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="hardware" className="space-y-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Exterior Detailing Hardware</h3>
                    <ul className="space-y-3 text-foreground">
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Foam Cannon:</strong> Applies thick foam for pre-soak (Use with pressure washer)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Pressure Washer (1,800 PSI / 1.2 GPM):</strong> Cleans exterior efficiently (Gentle enough for clear coat)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>2 Wash Buckets:</strong> One for soap, one for rinse (Prevents swirl marks)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Microfiber Wash Mitts:</strong> Hand washing paint (Avoid sponges)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Drying Towels:</strong> Absorbs water after rinse (Use plush microfiber)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Wheel Brushes (small & large):</strong> Cleans rims and barrels (Soft bristles prevent scratching)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Detailing Brushes:</strong> Agitate small crevices (Use different sizes)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Air Compressor + Blow Gun:</strong> Blows out water & debris (Speeds up drying)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Clay Bar or Clay Mitt:</strong> Removes bonded contaminants (Use before polishing)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Polisher (DA Orbital):</strong> Applies compounds & wax evenly (Safe for beginners)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Interior Detailing Hardware</h3>
                    <ul className="space-y-3 text-foreground">
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Interior Brushes:</strong> For vents, seams, & buttons (Soft nylon or boar's hair)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Drill Brush Set:</strong> For carpets, mats, seats (Attach to cordless drill)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Air Compressor:</strong> Blows dust out of cracks (Great for vents & tight areas)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Shop Vac (Wet/Dry):</strong> Suction for debris & liquids (Use crevice attachments)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Extractor (optional):</strong> Deep cleans carpets (Can rent or use portable unit)
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Microfiber Towels:</strong> General wiping & buffing (Use different colors for areas)
                      </li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chemicals" className="space-y-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Exterior Chemicals</h3>
                    <ul className="space-y-3 text-foreground">
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Car Shampoo (pH Neutral):</strong> Safely cleans without stripping wax (2 oz per 5 gallons)
                        <br /><span className="text-sm text-muted-foreground">✓ Gentle on all surfaces | ✗ Won't remove heavy grease</span>
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Degreaser / APC:</strong> Removes bugs, tar, grime (Dilute 4:1 for paint, 10:1 for light jobs)
                        <br /><span className="text-sm text-muted-foreground">✓ Versatile | ✗ Can strip wax</span>
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Iron Remover:</strong> Dissolves brake dust & fallout (Spray on wheels/paint before wash)
                        <br /><span className="text-sm text-muted-foreground">✓ Powerful decontamination | ✗ Strong odor</span>
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Sealant / Wax / Ceramic Spray:</strong> Protects paint & adds gloss
                        <br /><span className="text-sm text-muted-foreground">✓ Hydrophobic finish | ✗ Needs reapplication periodically</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Interior Chemicals</h3>
                    <ul className="space-y-3 text-foreground">
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>APC (All Purpose Cleaner):</strong> Cleans plastics, vinyl, fabrics (10:1 dilution)
                        <br /><span className="text-sm text-muted-foreground">✓ Economical | ✗ May dry out leather</span>
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Leather Cleaner & Conditioner:</strong> Safely cleans & nourishes leather
                        <br /><span className="text-sm text-muted-foreground">✓ Prevents cracking | ✗ Test for colorfastness</span>
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Glass Cleaner (Ammonia-Free):</strong> Cleans windows & mirrors
                        <br /><span className="text-sm text-muted-foreground">✓ Streak-free | ✗ Avoid on tinted windows with ammonia</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="process" className="space-y-6">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Exterior Detailing — Step by Step</h3>
                    <ol className="space-y-3 text-foreground list-decimal list-inside">
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Pre-Rinse / Foam Cannon:</strong> Rinse loose dirt, foam vehicle (dwell 3–5 min), rinse again
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Two-Bucket Wash:</strong> One bucket soap, one rinse; start top-down, rinse per section
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Wheels & Tires:</strong> Clean with acid-free cleaner & brushes, agitate, rinse, apply tire cleaner
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Decontamination:</strong> Spray iron remover (wait for color change), clay bar with lubricant
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Drying:</strong> Blow out water from mirrors/cracks, use microfiber towel
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Paint Correction (Optional):</strong> Compound → Polish → Wipe with IPA
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Protect:</strong> Apply wax/sealant/ceramic spray, dress tires & trim
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Final Touches:</strong> Clean glass, inspect for streaks
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3">Interior Detailing — Step by Step</h3>
                    <ol className="space-y-3 text-foreground list-decimal list-inside">
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Initial Prep:</strong> Remove trash, open doors for ventilation
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Blow Out / Vacuum:</strong> Use air compressor for dust, vacuum carpets/seats
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Clean Surfaces:</strong> Spray APC on towel, wipe dashboard/panels/vents
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Upholstery & Carpet:</strong> Spray fabric cleaner, agitate, extract/vacuum
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Leather Seats:</strong> Use cleaner, soft brush, buff dry; apply conditioner after 10 min
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Glass & Mirrors:</strong> Use ammonia-free cleaner + microfiber, wipe in cross pattern
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Protect & Dress:</strong> Apply UV protectant to plastics/vinyl
                      </li>
                      <li className="p-3 bg-background/50 rounded-lg">
                        <strong>Final Touches:</strong> Spray odor eliminator, inspect under daylight
                      </li>
                    </ol>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="mobile" className="space-y-6">
              <ScrollArea className="h-[600px] pr-4">
                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">Mobile Setup — F150 Bed Configuration</h3>
                  <p className="text-muted-foreground mb-4">All items below bed rail height (~18-19") to clear roll cover</p>
                  <ul className="space-y-3 text-foreground">
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Ryobi 1,800 PSI Pressure Washer:</strong> Compact electric model (Fits easily)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Gas Generator (2,000–2,500W):</strong> To power equipment (Keep ventilated)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>McGraw 3 Gal Air Compressor (110 PSI):</strong> For blowing interiors (Compact footprint)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Compact Shop Vac (4–5 Gal):</strong> Wet/Dry suction (Store near tank)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>50–60 Gal Flat Water Tank:</strong> Poly rectangle design (Fit under roll cover)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Retractable Extension Cord Reel (50–100ft):</strong> Heavy-duty 12 gauge (Mount to side panel)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Retractable Hose Reel (Pressure + Air):</strong> 25–50ft each (Bed side mount)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Bottle Holder Rack (Side Mount):</strong> Holds 6–8 spray bottles (For quick access)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Two 5-Gal Buckets (Stackable):</strong> Wash/Rinse (Store in front section)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Detailing Kit Tote:</strong> For towels, brushes, pads (Keep organized)
                    </li>
                    <li className="p-3 bg-background/50 rounded-lg">
                      <strong>Lighting / LED Bar:</strong> For night jobs (Mount to tailgate rail)
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4 p-3 bg-primary/10 rounded-lg">
                    💡 Tip: Use stackable bins and Velcro straps to secure equipment
                  </p>
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
