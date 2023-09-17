import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Game, playerT } from "./schema";
import { otherActor, claim, whoseMove } from "../src/common";

export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const cells: Game["cells"] = [];
    for (let i = 0; i < 1; i++) {
      cells.push([]);
      for (let j = 0; j < 20; j++) {
        cells[i].push({
          worth: {
            red: Math.floor(5 * Math.random()),
            blue: Math.floor(5 * Math.random()),
          },
        });
      }
    }
    return await ctx.db.insert("games", {
      cells: cells,
      currentActor: "red",
      currentActorDelegated: false,
      isOver: false,
      lastActorPassed: false,
      remainingResources: { red: 20, blue: 20 },
    });
  },
});

export const actionT = v.union(
  v.object({
    type: v.literal("claim"),
    i: v.number(),
    j: v.number(),
  }),
  v.object({
    type: v.literal("release"),
    i: v.number(),
    j: v.number(),
  }),
  v.object({ type: v.literal("delegateToMediator") }),
  v.object({ type: v.literal("pass") }),
);
export type Action = typeof actionT.type;
export const move = mutation({
  args: {
    id: v.id("games"),
    player: playerT,
    action: actionT,
  },
  handler: async (ctx, { id, player, action }) => {
    const oldGame = await ctx.db.get(id);
    if (oldGame === null) {
      throw new Error("Game not found");
    }
    if (oldGame.isOver) {
      throw new Error("Game already over");
    }
    if (player !== whoseMove(oldGame)) {
      throw new Error("not your turn");
    }
    const newGame = step(oldGame, action);
    await ctx.db.replace(id, newGame);
  },
});

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
