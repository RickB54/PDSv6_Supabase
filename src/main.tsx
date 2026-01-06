// Polyfill for older mobile browsers (MUST be first!)
import './lib/crypto-polyfill';

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Render with error catching
try {
    createRoot(document.getElementById("root")!).render(<App />);
} catch (error) {
    console.error("Failed to render App:", error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">Error loading app: ${error}</div>`;
}
