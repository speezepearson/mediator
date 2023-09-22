import {
  Outlet,
  RouteObject,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import {
  GamePage,
  GamePageProps,
  GameSelectionPage,
  PlayerSelectionPage,
  PlayerSelectionPageProps,
  WelcomePage,
} from "./App";

export const makeWelcomeRoute = () => "/welcome";

export const makeGameRoute = (x: { joinKey: string }) => `/g/${x.joinKey}`;

export function useNavigateToParty(): (x: { joinKey: string }) => void {
  const navigate = useNavigate();
  return (args) => {
    navigate(makeGameRoute(args));
  };
}

function Err() {
  const location = useLocation();
  const navigate = useNavigate();
  const isWeirdClerkRedirect = location.pathname.match(/^__clerk/);
  useEffect(() => {
    if (isWeirdClerkRedirect) {
      navigate("/");
    }
  });
  if (isWeirdClerkRedirect) {
    return <div>redirecting...</div>;
  }
  return <div>oh no, something terrible has happened; try refreshing</div>;
}

function Root() {
  return (
    <div>
      <nav className="navbar navbar-light bg-light mb-2">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            Mediator
          </a>
          <div className="me-auto" />
          {/* right-aligned stuff */}
        </div>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Root />,
    errorElement: <Err />,
    children: [
      {
        path: "/",
        element: <GameSelectionPage />,
      },
      {
        path: `/welcome`,
        element: <WelcomePage />,
      },
      {
        path: `/g/:gameId`,
        loader: async ({ params }) =>
          ({ gameId: params.gameId }) as PlayerSelectionPageProps,
        Component: () =>
          PlayerSelectionPage(useLoaderData() as PlayerSelectionPageProps),
      },
      {
        path: `/g/:gameId/:player`,
        loader: async ({ params }) =>
          ({ gameId: params.gameId, player: params.player }) as GamePageProps,
        Component: () => GamePage(useLoaderData() as GamePageProps),
      },
    ],
  },
];
