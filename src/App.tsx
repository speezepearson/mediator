import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Action } from "../convex/games";
import { claim, score, step, whoseMove } from "./common";
import { useState } from "react";
import { Player } from "../convex/schema";

function GameSelector(props: {
  onCreate: () => Promise<void>;
  onJoin: (id: Id<"games">) => void;
}) {
  const [gameIdF, setGameIdF] = useState("");
  return (
    <div>
      <button className="btn btn-sm btn-primary" onClick={props.onCreate}>
        Create game
      </button>
      <span className="ms-2">or</span>
      <input
        className="ms-2"
        type="text"
        placeholder="Game ID"
        onChange={(e) => setGameIdF(e.target.value)}
        value={gameIdF}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            props.onJoin(gameIdF as Id<"games">);
          }
        }}
      />
      <button
        className="btn btn-sm btn-primary ms-2"
        onClick={() => props.onJoin(gameIdF as Id<"games">)}
      >
        Join game
      </button>
    </div>
  );
}

function PlayerSelector(props: { onSet: (player: Player) => void }) {
  return (
    <div>
      You are:
      <button
        onClick={() => props.onSet("red")}
        className="btn btn-sm btn-primary ms-2"
      >
        Red
      </button>
      <button
        onClick={() => props.onSet("blue")}
        className="btn btn-sm btn-primary ms-2"
      >
        Blue
      </button>
      <button
        onClick={() => props.onSet("mediator")}
        className="btn btn-sm btn-primary ms-2"
      >
        Mediator
      </button>
    </div>
  );
}

function App(props: {
  urlGameId: null | Id<"games">;
  urlPlayer: null | Player;
}) {
  const createGame = useMutation(api.games.create);
  const [gameId, setGameId] = useState<null | Id<"games">>(props.urlGameId);
  const [player, setPlayer] = useState<null | Player>(props.urlPlayer);
  const game = useQuery(
    api.games.get,
    gameId === null
      ? "skip"
      : {
          id: gameId,
        },
  );
  const moveMut = useMutation(api.games.move);

  if (gameId === null) {
    return (
      <GameSelector
        onCreate={async () => setGameId(await createGame())}
        onJoin={setGameId}
      />
    );
  }
  if (player === null) {
    return <PlayerSelector onSet={setPlayer} />;
  }

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
      {player !== "mediator" && <div>
        Remaining resources: {game.remainingResources[player]}
      </div>}
      <table className="text-center mt-2">
        <tbody>
          {game.cells.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const canClaim =
                  isOurTurn &&
                  ((!game.currentActorDelegated &&
                    player === game.currentActor) ||
                    (game.currentActorDelegated && player === "mediator")) &&
                  cell.occupier?.actor !== game.currentActor &&
                  claim(game, i, j).type === "ok";
                return (
                  <td key={j}>
                    <button
                      className="btn btn-sm btn-outline-primary"
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
                        outline: cell.occupier?.mediated
                          ? "2px solid gold"
                          : undefined,
                      }}
                      onClick={async () => {
                        if (cell.occupier?.actor === game.currentActor)
                          return await move({ type: "release", i, j });
                        if (!canClaim) return;
                        await move({ type: "claim", i, j });
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
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
    </>
  );
}

export default App;
