import "./App.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Action } from "../convex/games";
import { claim } from "./common";
import { useState } from "react";

function App() {
  const createGame = useMutation(api.games.create);
  const [gameId, setGameId] = useState<null | Id<'games'>>(null);
  const game = useQuery(api.games.get, gameId === null ? 'skip' : {
    id: gameId,
  });
  const moveMut = useMutation(api.games.move);

  if (gameId === null) {
    return <button onClick={async () => setGameId(await createGame())}>Create game</button>
  }

  if (game === undefined) {
    return <div>Loading...</div>;
  }
  if (game === null) {
    return <div>Game not found</div>;
  }
  const move = (action: Action) =>
    moveMut({ id: game._id, player: game.currentActor, action });

  return (
    <>
      {game.isOver
        ? "Game over"
        : (game.currentActor === "red" ? "Red's turn" : "Blue's turn") +
          (game.currentActorDelegated ? " (delegated)" : "")}
      {!game.isOver && (
        <button onClick={() => move({ type: "pass" })}>Pass</button>
      )}
      {!game.isOver && (
        <button onClick={() => move({ type: "delegateToMediator" })}>
          Delegate
        </button>
      )}
      <table>
        <tbody>
          {game.cells.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const canClaim =
                  !game.isOver &&
                  cell.occupier?.actor !== game.currentActor &&
                  claim(game, i, j).type === "ok";
                return (
                  <td
                    key={j}
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: ((): string => {
                        switch (cell.occupier?.actor) {
                          case undefined:
                            return "white";
                          case "red":
                            return "red";
                          case "blue":
                            return "blue";
                        }
                      })(),
                      outline: cell.occupier?.mediated
                        ? "2px solid gold"
                        : undefined,
                    }}
                    onClick={async () => {
                      if (!canClaim) return;
                      await move({ type: "claim", cell: [i, j] });
                    }}
                  >
                    {cell.worth[game.currentActor]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default App;
