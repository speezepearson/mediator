import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Action, GameDistribution } from "../convex/games";
import {
  Result,
  claim,
  hexNeighbors,
  hexy2xy,
  sampleFromGameDistribution,
  score,
  step,
  whoseMove,
} from "./common";
import { useMemo, useState } from "react";
import { Game, Player } from "../convex/schema";
import { Set } from "immutable";
import { useNavigate } from "react-router-dom";

export function WelcomePage() {
  return <>Hi!</>;
}

export function GameSelectionPage() {
  const navigate = useNavigate();

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
            navigate(`/g/${gameIdF}`);
          }
        }}
      />
      <button
        className="btn btn-sm btn-primary ms-2"
        disabled={gameIdF === ""}
        onClick={() => navigate(`/g/${gameIdF}`)}
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
            navigate(`/g/${gid}`);
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
  const navigate = useNavigate();
  return (
    <div>
      You are:
      <button
        onClick={() => navigate(`/g/${props.gameId}/red`)}
        className="btn btn-sm btn-primary ms-2"
      >
        Red
      </button>
      <button
        onClick={() => navigate(`/g/${props.gameId}/blue`)}
        className="btn btn-sm btn-primary ms-2"
      >
        Blue
      </button>
      <button
        onClick={() => navigate(`/g/${props.gameId}/mediator`)}
        className="btn btn-sm btn-primary ms-2"
      >
        Mediator
      </button>
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
  const {minX, maxX, minY, maxY} = game.cells.reduce(
    ({minX, maxX, minY, maxY}, {i, j}) => {
      const [x,y] = hexy2xy(i, j);
      return {
        minX: Math.min(minX, x),
        maxX: Math.max(maxX, x),
        minY: Math.min(minY, y),
        maxY: Math.max(maxY, y),
    };
    },
    {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity},
  )

  const ownedCells = game.cells.filter(
    ({ v }) => v.occupier?.actor === game.currentActor,
  );
  const neighborCellIdxs = Set(
    ownedCells.flatMap(({ i, j }) =>
      hexNeighbors(i, j).map(([i, j]) => `${i},${j}`),
    ),
  );

  return (
    <div className="position-relative m-4" style={{height: `${3*(maxY-minY)}em`, width: `${3*(maxX-minX)}em`}}>
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
          <div
            key={`${i},${j}`}
            className="position-absolute text-center p-0 m-0"
            style={{
              left: `${3 * (x - minX)}em`,
              top: `${3 * (maxY - y)}em`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <button
              className={`btn btn-sm btn-outline-${
                canClaim ? "dark" : "muted"
              }`}
              style={{
                backgroundColor: ((): string => {
                  switch (cell.occupier?.actor) {
                    case undefined:
                      return "";
                    case "red":
                      return "#ff000044";
                    case "blue":
                      return "#0000ff44";
                  }
                })(),
                outline: cell.occupier?.mediated ? "2px solid gold" : undefined,
              }}
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
          </div>
        );
      })}
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
    <>
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
      <RenderBoard game={game} player={player} onMove={move} />
    </>
  );
}

export function Root() {}
