import { RouteObject, useLoaderData, useNavigate } from "react-router-dom";
import {
  GamePage,
  GamePageProps,
  GameSelectionPage,
  PlayerSelectionPage,
  PlayerSelectionPageProps,
  WelcomePage,
} from "./App";
import { Id } from "../convex/_generated/dataModel";
import { Player } from "../convex/schema";
import { Root } from "./components/Root";

export const makeWelcomeRoute = () => "/welcome";

export const makeGameRoute = (x: { gameId: Id<"games">; player: Player }) =>
  `/g/${x.gameId}/${x.player}`;
export function useNavigateToGame(): (x: {
  gameId: Id<"games">;
  player: Player;
}) => void {
  const navigate = useNavigate();
  return (args) => {
    navigate(makeGameRoute(args));
  };
}

export const makePlayerSelectionRoute = (x: { gameId: Id<"games"> }) =>
  `/g/${x.gameId}`;
export function useNavigateToPlayerSelection(): (x: {
  gameId: Id<"games">;
}) => void {
  const navigate = useNavigate();
  return (args) => {
    navigate(makePlayerSelectionRoute(args));
  };
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "/",
        element: <GameSelectionPage />,
      },
      {
        path: makeWelcomeRoute(),
        element: <WelcomePage />,
      },
      {
        path: makePlayerSelectionRoute({ gameId: `:gameId` as Id<"games"> }),
        loader: async ({ params }) =>
          ({ gameId: params.gameId }) as PlayerSelectionPageProps,
        Component: () =>
          PlayerSelectionPage(useLoaderData() as PlayerSelectionPageProps),
      },
      {
        path: makeGameRoute({
          gameId: `:gameId` as Id<"games">,
          player: `:player` as Player,
        }),
        loader: async ({ params }) =>
          ({ gameId: params.gameId, player: params.player }) as GamePageProps,
        Component: () => GamePage(useLoaderData() as GamePageProps),
      },
    ],
  },
];
