import { ArrowLeft, BookOpen, Info, Edit, Trash2, PlusCircle, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ChemicalInventoryHelp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center space-x-4 pb-4 border-b border-emerald-900">
          <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-zinc-800 text-zinc-400">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="flex items-center text-emerald-400 gap-3">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-3xl font-bold tracking-tight text-white">Chemical Inventory Help Guide</h1>
          </div>
        </div>

        {/* Introduction */}
        <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
          <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
            <Info className="w-5 h-5" /> Overview
          </h2>
          <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
            The Chemical Inventory Edit Modal is the centralized place to manage all properties of a single detailing chemical. 
            From here, you can update basic information, manage varying bottle sizes and costs, categorize the product, and assign dilution ratios.
            With the multi-bottle feature, you no longer need to create duplicate entries for the same chemical just because it comes in different sizes!
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How to add new sizes */}
          <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <PlusCircle className="w-5 h-5" /> Adding a New Bottle Size
            </h3>
            <ul className="list-decimal list-inside text-zinc-300 space-y-2 text-sm leading-relaxed">
              <li>Scroll down to the <span className="text-emerald-300 font-medium">Stock & Pricing</span> section.</li>
              <li>Click the dashed button labeled <span className="text-zinc-100 font-medium">"Add Another Bottle Size"</span>.</li>
              <li>A new row will appear. Enter the specific bottle size (e.g., "1 Gallon").</li>
              <li>Input the specific cost, current stock, and low-stock threshold for this size variant.</li>
              <li>When you click <strong>Save</strong>, all variants are securely stored under the same chemical profile.</li>
            </ul>
          </section>

          {/* How to modify */}
          <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
              <Edit className="w-5 h-5" /> Modifying an Existing Record
            </h3>
            <ul className="list-decimal list-inside text-zinc-300 space-y-2 text-sm leading-relaxed">
              <li>Open the desired chemical card from the inventory list by clicking the <span className="text-zinc-100 font-medium">Edit (pencil)</span> icon.</li>
              <li>Change the Product Name, Brand, or Purchase details in the <span className="text-zinc-100 font-medium">Basic Information</span> grid.</li>
              <li>Update your <strong>Current Stock</strong> value directly in the variant row if you've consumed or restocked a specific size.</li>
              <li>Click the primary <strong>Save</strong> button at the bottom of the modal to apply the changes.</li>
            </ul>
          </section>

          {/* How to delete */}
          <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Deleting a Bottle Size vs. Deleting the Chemical
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-zinc-950 p-4 rounded-lg border border-red-900/30">
                <h4 className="text-red-300 font-medium mb-2">Deleting a Specific Bottle Size</h4>
                <p className="text-zinc-400 text-sm">
                  If you no longer carry a certain size (e.g., you stopped buying the 16oz version), go to the Stock & Pricing section and click the <span className="text-red-400">red 'X' icon</span> on that specific row. A warning prompt will ask for your confirmation. Once you save the modal, only that size is removed; the main chemical and other sizes remain.
                </p>
              </div>
              <div className="bg-zinc-950 p-4 rounded-lg border border-red-900/30">
                <h4 className="text-red-300 font-medium mb-2">Deleting the Entire Chemical</h4>
                <p className="text-zinc-400 text-sm">
                  If you want to remove the chemical entirely (including all its sizes), use the main <span className="text-red-400 font-medium">"Delete"</span> button located at the very bottom right of the modal. This will erase the product and all associated variants from your inventory permanently.
                </p>
              </div>
            </div>
          </section>

          {/* AI Dilution Ratios */}
          <section className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
              <FlaskConical className="w-5 h-5" /> AI Templates & Dilution Ratios
            </h3>
            <p className="text-zinc-300 leading-relaxed text-sm">
              If the chemical you are adding matches an entry in the built-in Library, the app will automatically suggest a pre-filled template, including safety warnings, descriptions, and recommended dilution ratios. 
              <br/><br/>
              When you first add a new chemical and select its template from the top dropdown, the system links the library card and saves you from manually typing standard instructions.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
};

export default ChemicalInventoryHelp;
