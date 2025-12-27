import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('PWA: Service worker registered'))
      .catch((err) => console.log('PWA: Service worker registration failed', err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
