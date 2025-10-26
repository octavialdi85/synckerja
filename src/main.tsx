import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress react-beautiful-dnd defaultProps deprecation warning
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Support for defaultProps will be removed from memo components') ||
     args[0].includes('Connect(Droppable): Support for defaultProps'))
  ) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById("root")!).render(<App />);
