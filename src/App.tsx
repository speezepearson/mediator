import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Action, GameDistribution } from "../convex/games";
import {
  Result,
  claim,
  hexNeighbors,
  hexy2xy,
  otherActor,
  sampleFromGameDistribution,
  score,
  step,
  whoseMove,
} from "./common";
import { HTMLAttributes, useMemo, useState } from "react";
import { Game, Player } from "../convex/schema";
import { Set } from "immutable";
import { useHref } from "react-router-dom";
import QRCode from "react-qr-code";
import { CopyWidget } from "./components/CopyWidget";
import { useNavigateToGame, useNavigateToPlayerSelection } from "./routes";

export function WelcomePage() {
  return <>Hi!</>;
}

export function GameSelectionPage() {
  const navigateToPlayerSelection = useNavigateToPlayerSelection();

  const create = useMutation(api.games.create);

  const [gameIdF, setGameIdF] = useState("");
  const [sizeF, setSizeF] = useState("5");
  const [startingResourcesF, setStartingResourcesF] = useState("30");

  const board: Result<{ dist: GameDistribution; sample: Game }> =
    useMemo(() => {
      const [size, startingResources] = [sizeF, startingResourcesF].map((x) =>
        parseInt(x),
      );
      if (isNaN(size) || isNaN(startingResources)) {
        return { type: "err", msg: "invalid input" };
      }
      if (size <= 1) {
        return { type: "err", msg: "size must be at least 2" };
      }
      if (size > 20) {
        return { type: "err", msg: "size must be <= 20" };
      }
      if (startingResources <= 0) {
        return { type: "err", msg: "starting resources must be positive" };
      }

      const dist: GameDistribution = {
        resources: { type: "exact", value: startingResources },
        board: {
          type: "iid-uniform-hex-grid",
          sideLength: parseInt(sizeF),
          min: 0,
          max: 10,
        },
      };
      return {
        type: "ok",
        val: { dist, sample: sampleFromGameDistribution(dist) },
      };
    }, [sizeF, startingResourcesF]);

  return (
    <div>
      <input
        className="ms-2"
        type="text"
        placeholder="Game ID"
        onChange={(e) => setGameIdF(e.target.value)}
        value={gameIdF}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            navigateToPlayerSelection({ gameId: gameIdF as Id<"games"> });
          }
        }}
      />
      <button
        className="btn btn-sm btn-primary ms-2"
        disabled={gameIdF === ""}
        onClick={() =>
          navigateToPlayerSelection({ gameId: gameIdF as Id<"games"> })
        }
      >
        Join game
      </button>
      <div>or</div>
      <div>
        <input
          className="ms-2"
          type="text"
          placeholder="Width"
          onChange={(e) => setSizeF(e.target.value)}
          value={sizeF}
        />
        <input
          className="ms-2"
          type="text"
          placeholder="Starting resources"
          onChange={(e) => setStartingResourcesF(e.target.value)}
          value={startingResourcesF}
        />
        <button
          className="btn btn-sm btn-primary"
          onClick={async () => {
            if (board.type === "err") return;
            const gid = await create({ game: board.val.sample });
            navigateToPlayerSelection({ gameId: gid });
          }}
        >
          Create game
        </button>
        {board.type === "err" ? (
          <div className="text-danger">{board.msg}</div>
        ) : (
          <>
            <RenderBoard game={board.val.sample} player="red" onMove={null} />
          </>
        )}
      </div>
    </div>
  );
}

export type PlayerSelectionPageProps = {
  gameId: Id<"games">;
};
export function PlayerSelectionPage(props: PlayerSelectionPageProps) {
  const navigateToGame = useNavigateToGame();
  return (
    <div>
      You are:
      <button
        onClick={() => navigateToGame({ gameId: props.gameId, player: "red" })}
        className="btn btn-sm btn-primary ms-2"
      >
        Red
      </button>
      <button
        onClick={() => navigateToGame({ gameId: props.gameId, player: "blue" })}
        className="btn btn-sm btn-primary ms-2"
      >
        Blue
      </button>
      <button
        onClick={() =>
          navigateToGame({ gameId: props.gameId, player: "mediator" })
        }
        className="btn btn-sm btn-primary ms-2"
      >
        Mediator
      </button>
    </div>
  );
}

function Hexagon(
  props: {
    w: number | string;
    h: number | string;
    outline?: { width: number; color: string };
    innerStyle?: React.CSSProperties;
  } & React.DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
) {
  const { w, h } = props;
  const outerStyle = {
    ...props.style,
    width: w,
    height: h,
    clipPath: "polygon(0% 25%, 0% 75%, 50% 100%, 100% 75%, 100% 25%, 50% 0%)",
    backgroundColor: props.outline?.color,
  };
  const outlineWidth = props.outline?.width ?? 0;
  return (
    <div className="position-absolute text-center p-0 m-0" style={outerStyle}>
      <div
        className="position-absolute"
        style={{
          left: outlineWidth,
          top: outlineWidth,
          clipPath:
            "polygon(0% 25%, 0% 75%, 50% 100%, 100% 75%, 100% 25%, 50% 0%)",
          backgroundColor: "white",
          width: `calc(${w} - ${2 * outlineWidth}px)`,
          height: `calc(${h} - ${2 * outlineWidth}px)`,
          zIndex: 1,
          ...props.innerStyle,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

function RenderBoard(props: {
  game: Game;
  player: Player;
  onMove: null | ((action: Action) => void);
}) {
  const { game, player, onMove } = props;
  const isOurTurn = !game.isOver && whoseMove(game) === player;
  const { minX, minY } = game.cells.reduce(
    ({ minX, maxX, minY, maxY }, { i, j }) => {
      const [x, y] = hexy2xy(i, j);
      return {
        minX: Math.min(minX, x),
        maxX: Math.max(maxX, x),
        minY: Math.min(minY, y),
        maxY: Math.max(maxY, y),
      };
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  const ownedCells = game.cells.filter(
    ({ v }) => v.occupier?.actor === game.currentActor,
  );
  const neighborCellIdxs = Set(
    ownedCells.flatMap(({ i, j }) =>
      hexNeighbors(i, j).map(([i, j]) => `${i},${j}`),
    ),
  );

  return (
    <div
      className="ratio"
      style={{
        maxWidth: "40em",
        ["--bs-aspect-ratio" as string]: `${(100 * Math.sqrt(3)) / 2}%`,
      }}
    >
      <div className="d-flex flex-row justify-content-center align-items-center p-4">
        <div
          className="position-relative w-100 h-100"
          style={
            {
              // height: `${3 * (maxY - minY)}em`,
              // width: `${3 * (maxX - minX)}em`,
            }
          }
        >
          {" "}
          {game.cells.map(({ i, j, v: cell }) => {
            const canClaim =
              isOurTurn &&
              onMove !== null &&
              ((!game.currentActorDelegated && player === game.currentActor) ||
                (game.currentActorDelegated && player === "mediator")) &&
              cell.occupier?.actor !== game.currentActor &&
              neighborCellIdxs.has(`${i},${j}`) &&
              claim(game, i, j).type === "ok";
            const [x, y] = hexy2xy(i, j);
            return (
              <Hexagon
                key={`${i},${j}`}
                className="position-absolute text-center p-0 m-0"
                w={`${3}em`}
                h={`${(3 * 2) / Math.sqrt(3)}em`}
                outline={
                  cell.occupier?.mediated
                    ? { width: 3, color: "#ff00ff" }
                    : canClaim
                    ? { width: 1, color: game.currentActor }
                    : undefined
                }
                style={{
                  left: `${3.2 * (x - minX) - 2}em`,
                  top: `${3.2 * (y - minY) - 2}em`,
                }}
                innerStyle={{
                  backgroundColor: ((): string => {
                    switch (cell.occupier?.actor) {
                      case undefined:
                        return "white";
                      case "red":
                        return "#ffcccc";
                      case "blue":
                        return "#ccccff";
                    }
                  })(),
                }}
              >
                <button
                  className={`btn btn-sm w-100 h-100`}
                  disabled={!canClaim}
                  onClick={async () => {
                    if (onMove === null) return;
                    if (cell.occupier?.actor === game.currentActor)
                      return await onMove({ type: "release", i, j });
                    if (!canClaim) return;
                    await onMove({ type: "claim", i, j });
                  }}
                >
                  {player === "mediator" ? (
                    <>
                      <div style={{ color: "red" }}>{cell.worth.red}</div>
                      <div style={{ color: "blue" }}>{cell.worth.blue}</div>
                    </>
                  ) : (
                    cell.worth[player]
                  )}
                </button>
              </Hexagon>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type GamePageProps = {
  gameId: Id<"games">;
  player: Player;
};
export function GamePage({ gameId, player }: GamePageProps) {
  const game = useQuery(
    api.games.get,
    gameId === undefined
      ? "skip"
      : {
          id: gameId,
        },
  );
  const moveMut = useMutation(api.games.move);

  const joinLink = `${window.location.origin}/${useHref(`/g/${game?._id}`)}`;

  if (game === undefined) {
    return <div>Loading...</div>;
  }
  if (game === null) {
    return <div>Game not found</div>;
  }
  const isOurTurn = !game.isOver && whoseMove(game) === player;
  const move = (action: Action) => moveMut({ id: game._id, player, action });
  const scores = score(game);

  return (
    <div className="row">
      <div className="col-3 bg-light border-end border-secondary p-4">
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary ms-1"
            data-bs-toggle="modal"
            data-bs-target="#shareModal"
          >
            <i className="fa fa-share"></i> Share
          </button>
        </div>
        <div
          className="modal fade"
          id="shareModal"
          tabIndex={-1}
          aria-labelledby="exampleModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                {/* <h5 className="modal-title" id="exampleModalLabel">Modal title</h5> */}
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body text-center">
                <div className="mt-1">
                  Your friends can join by scanning this handy QR code:
                </div>
                <QRCode className="mt-2" value={joinLink} />
                <div className="mt-2">Or, send them this link:</div>
                <CopyWidget
                  className="mt-1 mx-auto"
                  style={{ maxWidth: "20em" }}
                  text={joinLink}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        {game.isOver ? (
          "Game over"
        ) : isOurTurn ? (
          <>
            Your move!{" "}
            {player === "mediator" && ` (on behalf of ${game.currentActor})`}{" "}
          </>
        ) : (
          (game.currentActor === "red" ? "Red's turn" : "Blue's turn") +
          (game.currentActorDelegated ? " (delegated)" : "")
        )}
        <div>
          Your score:{" "}
          {player === "mediator" ? (
            <>
              {scores.red + scores.blue} ={" "}
              <span style={{ color: "red" }}>{scores.red}</span> +{" "}
              <span style={{ color: "blue" }}>{scores.blue}</span>
            </>
          ) : (
            scores[player]
          )}
        </div>
        {player !== "mediator" && (
          <div>{otherActor(player)}'s score: who cares</div>
        )}
        {player !== "mediator" && (
          <div>Remaining resources: {game.remainingResources[player]}</div>
        )}
        <div className="mt-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => move({ type: "pass" })}
            disabled={!isOurTurn}
          >
            Pass {step(game, { type: "pass" })?.isOver && " (end game)"}
          </button>
          <button
            className="btn btn-sm btn-outline-primary ms-1"
            onClick={() => move({ type: "delegateToMediator" })}
            disabled={!isOurTurn}
          >
            Delegate
          </button>
        </div>
      </div>
      <div className="col-9">
        <RenderBoard game={game} player={player} onMove={move} />
      </div>
    </div>
  );
}
