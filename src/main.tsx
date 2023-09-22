import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import "./assets/bootstrap.min.css";
import { RouterProvider, createHashRouter } from "react-router-dom";
import { routes } from "./routes.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <RouterProvider router={createHashRouter(routes)} />
    </ConvexProvider>
  </React.StrictMode>,
);
