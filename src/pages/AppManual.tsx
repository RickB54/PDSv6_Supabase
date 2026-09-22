import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppManualPrintView from "@/components/help/AppManualPrintView";

export default function AppManual() {
  const [searchParams] = useSearchParams();
  const isSample = searchParams.get('sample') === 'true';
  const autoPrint = searchParams.get('print') === 'true';

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return <AppManualPrintView sampleMode={isSample} />;
}
