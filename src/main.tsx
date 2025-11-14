import { createRoot } from "react-dom/client";
import { ensurePdfWorker } from "@/lib/pdfWorker";
import App from "./App.tsx";
import "./index.css";

// Initialize PDF.js worker
ensurePdfWorker();

createRoot(document.getElementById("root")!).render(<App />);
