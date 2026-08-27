import BusinessDrive from "@/components/BusinessDrive";
import { PageHeader } from "@/components/PageHeader";

const FileManager = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] overflow-hidden">
      <div className="flex-1 p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        <PageHeader 
          title="Business Drive" 
          subtitle="Manage and organize all your business documents in one secure place."
        />
        <div className="w-full h-full pb-20">
          <BusinessDrive />
        </div>
      </div>
    </div>
  );
};

export default FileManager;
