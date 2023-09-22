import { GameDistribution } from "../convex/games";
import { Action, Actor, Game, Player } from "../convex/schema";

export function claim(
  game: Game,
  i: number,
  j: number,
): { type: "ok"; res: Game } | { type: "err"; msg: "not enough resources" } {
  const cellIdx = game.cells.findIndex((c) => i === c.i && j == c.j);
  const cell = game.cells[cellIdx].v;
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
      cells: game.cells
        .slice(0, cellIdx)
        .concat({
          ...game.cells[cellIdx],
          v: {
            ...cell,
            occupier: {
              actor: game.currentActor,
              mediated: game.currentActorDelegated,
            },
          },
        })
        .concat(game.cells.slice(cellIdx + 1)),
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
  for (const { v: cell } of game.cells) {
    if (cell.occupier) {
      scores[cell.occupier.actor] += cell.worth[cell.occupier.actor];
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
    case "release": {
      const cellIdx = game.cells.findIndex(
        (c) => action.i === c.i && action.j == c.j,
      );
      const cell = game.cells[cellIdx].v;
      return {
        ...game,
        currentActorDelegated: false,
        cells: game.cells
          .slice(0, cellIdx)
          .concat({
            ...game.cells[cellIdx],
            v: {
              ...cell,
              occupier: undefined,
            },
          })
          .concat(game.cells.slice(cellIdx + 1)),
      };
    }
    case "delegateToMediator":
      return {
        ...game,
        currentActorDelegated: true,
      };
  }
}
export function sampleFromGameDistribution(dist: GameDistribution): Game {
  const remainingResources: Game["remainingResources"] = (() => {
    switch (dist.resources.type) {
      case "exact":
        return { red: dist.resources.value, blue: dist.resources.value };
      case "uniform":
        return {
          red: sampleFromRange(dist.resources.min, dist.resources.max),
          blue: sampleFromRange(dist.resources.min, dist.resources.max),
        };
    }
  })();
  const cells: Game["cells"] = (() => {
    switch (dist.board.type) {
      case "iid-uniform-hex-grid": {
        const [sideLength, min, max] = [
          dist.board.sideLength,
          dist.board.min,
          dist.board.max,
        ];
        return makeHexGrid(sideLength, () => ({
          occupier: undefined,
          worth: {
            red: sampleFromRange(min, max),
            blue: sampleFromRange(min, max),
          },
        }));
      }
    }
  })();

  const redStart = Math.floor(Math.random() * cells.length);
  const blueStart = (() => {
    let res = Math.floor(Math.random() * cells.length);
    while (res === redStart) {
      res = Math.floor(Math.random() * cells.length);
    }
    return res;
  })();
  cells[redStart].v.occupier = { actor: "red", mediated: false };
  cells[blueStart].v.occupier = { actor: "blue", mediated: false };

  return {
    cells,
    remainingResources,
    currentActor: "red",
    currentActorDelegated: false,
    lastActorPassed: false,
    isOver: false,
  };
}

function sampleFromRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export type Result<T> = { type: "ok"; val: T } | { type: "err"; msg: string };

const sqrt3_2 = Math.sqrt(3) / 2;
export function hexy2xy(i: number, j: number): [number, number] {
  return [-i / 2 + j, i * sqrt3_2];
}
function makeHexGrid<T>(
  sideLength: number,
  valueAt: (i: number, j: number) => T,
): { i: number; j: number; v: T }[] {
  const result: { i: number; j: number; v: T }[] = [];
  for (let i = 0; i < 2 * sideLength - 1; i++) {
    const [min, max] =
      i < sideLength
        ? [0, sideLength + i]
        : [i - sideLength + 1, 2 * sideLength - 1];
    for (let j = min; j < max; j++) {
      result.push({ i, j, v: valueAt(i, j) });
    }
  }
  return result;
}

export function hexNeighbors(i: number, j: number): [number, number][] {
  return [
    [i - 1, j],
    [i + 1, j],
    [i, j - 1],
    [i, j + 1],
    [i + 1, j + 1],
    [i - 1, j - 1],
  ];
}

export function currentPlayer(game: Game): Player {
  if (game.currentActorDelegated) {
    return "mediator";
  }
  return game.currentActor;
}
