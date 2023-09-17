import { Action } from "../convex/games";
import { Actor, Game, Player } from "../convex/schema";

export function claim(
  game: Game,
  x: number,
  y: number,
): { type: "ok"; res: Game } | { type: "err"; msg: "not enough resources" } {
  const cell = game.cells[x][y]; // TODO: bounds check
  const costToClaim = cell.occupier ? 3 : 1;
  if (game.remainingResources[game.currentActor] < costToClaim) {
    return { type: "err", msg: "not enough resources" };
  }
  return {
    type: "ok",
    res: {
      ...game,
      currentActorDelegated: false,
      lastActorPassed: false,
      remainingResources: {
        ...game.remainingResources,
        [game.currentActor]:
          game.remainingResources[game.currentActor] - costToClaim,
      },
      currentActor: otherActor(game.currentActor),
      cells: game.cells.map((row, i) =>
        row.map((cell, j) => {
          if (i === x && j === y) {
            return {
              ...cell,
              occupier: {
                actor: game.currentActor,
                mediated: game.currentActorDelegated,
              },
            };
          }
          return cell;
        }),
      ),
    },
  };
}

export function otherActor(actor: Actor): Actor {
  switch (actor) {
    case "red":
      return "blue";
    case "blue":
      return "red";
  }
}

export function whoseMove(game: Game): Player {
  if (game.currentActorDelegated) {
    return "mediator";
  }
  return game.currentActor;
}

export function score(game: Game): { red: number; blue: number } {
  const scores = { red: 0, blue: 0 };
  for (const row of game.cells) {
    for (const cell of row) {
      if (cell.occupier) {
        scores[cell.occupier.actor] += cell.worth[cell.occupier.actor];
      }
    }
  }
  return scores;
}

export function step(game: Game, action: Action): Game {
  switch (action.type) {
    case "pass":
      return {
        cells: game.cells,
        currentActor: otherActor(game.currentActor),
        currentActorDelegated: false,
        lastActorPassed: true,
        isOver: game.lastActorPassed,
        remainingResources: game.remainingResources,
      };
    case "claim": {
      const newGame = claim(game, action.i, action.j);
      if (newGame.type === "err") {
        throw new Error(newGame.msg);
      }
      return newGame.res;
    }
    case "release":
      return {
        ...game,
        currentActorDelegated: false,
        cells: game.cells.map((row, i) =>
          row.map((cell, j) => {
            if (i === action.i && j === action.j) {
              return {
                ...cell,
                occupier: undefined,
              };
            }
            return cell;
          }),
        ),
      };
    case "delegateToMediator":
      return {
        ...game,
        currentActorDelegated: true,
      };
  }
}
