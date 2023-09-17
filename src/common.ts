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
