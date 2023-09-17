import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import "./assets/bootstrap.min.css";
import { Id } from "../convex/_generated/dataModel";
import { Player } from "../convex/schema.ts";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const gameId: null | Id<"games"> = new URLSearchParams(
  window.location.search,
).get("gameId") as null | Id<"games">;
const player: null | Player = new URLSearchParams(window.location.search).get(
  "player",
) as null | Player;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App urlGameId={gameId} urlPlayer={player} />
    </ConvexProvider>
  </React.StrictMode>,
);
