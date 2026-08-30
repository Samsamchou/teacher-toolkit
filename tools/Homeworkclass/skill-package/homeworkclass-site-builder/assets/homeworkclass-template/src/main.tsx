import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadFirebaseConfig } from "./services/firebaseClient";
import "./styles.css";

const bootstrap = async () => {
  await loadFirebaseConfig();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void bootstrap();
