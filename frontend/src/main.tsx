import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "primereact/resources/primereact.min.css";
import "./index.css";
import App from "./App";
import { setupAxiosAuthInterceptors } from "./lib/axiosAuth";

// Mock Testing via MSW
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === "true") {
  const { worker } = await import("./mocks/browser");
  worker.start();
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

setupAxiosAuthInterceptors();

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
