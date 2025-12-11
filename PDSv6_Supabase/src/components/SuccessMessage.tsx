import { CheckCircle } from "lucide-react";

const SuccessMessage = ({ title = "Sent successfully", description = "We’ll be in touch shortly." }: { title?: string; description?: string }) => {
  return (
    <div className="border border-green-600/30 bg-green-600/10 text-green-600 rounded-md p-4 flex items-start gap-3 mt-4">
      <CheckCircle className="h-5 w-5 flex-shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm opacity-90">{description}</div>
      </div>
    </div>
  );
};

export default SuccessMessage;
