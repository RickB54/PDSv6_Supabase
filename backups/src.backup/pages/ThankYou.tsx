import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

export default function ThankYou() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const name = params.get("name") || "Valued Customer";
  const total = params.get("total") || "0";
  const time = params.get("time") || "";
  const date = params.get("date") || "";
  const technician = "Prime Detail Solutions Team";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        <h1 className="text-6xl font-bold text-white mb-8 animate-pulse">
          THANK YOU!
        </h1>
        <p className="text-3xl text-red-500 mb-6">
          {name}, your ${total} booking is CONFIRMED!
        </p>
        <p className="text-2xl text-zinc-300 mb-8">
          {time} on {date} — {technician} is ready for you.
        </p>
        <div className="bg-zinc-800/50 backdrop-blur rounded-2xl p-10 border-4 border-red-600/50">
          <p className="text-xl text-white mb-6">
            A detailed receipt has been emailed to you.
          </p>
          <p className="text-lg text-zinc-400">
            Prime Detail Solutions — Where Your Car Gets The Royal Treatment
          </p>
        </div>
        <Button
          size="lg"
          className="mt-12 bg-red-600 hover:bg-red-700 text-2xl px-16 py-8"
          onClick={() => (window.location.href = "/")}
        >
          Back to Website
        </Button>
      </div>
    </div>
  );
}

