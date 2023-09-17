import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Game, actorT } from "./schema";
import { otherActor, claim } from "../src/common";

export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const cells: (Game["cells"]) = [];
    for (let i = 0; i < 7; i++) {
      cells.push([]);
      for (let j = 0; j < 7; j++) {
        cells[i].push({
          worth: { red: 1, blue: 1 },
        });
      }
    }
    return await ctx.db.insert('games', {
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
    cell: v.array(v.number()),
  }),
  v.object({ type: v.literal("delegateToMediator") }),
  v.object({ type: v.literal("pass") }),
);
export type Action = typeof actionT.type;
export const move = mutation({
  args: {
    id: v.id("games"),
    player: actorT,
    action: actionT,
  },
  handler: async (ctx, { id, action }) => {
    const oldGame = await ctx.db.get(id);
    if (oldGame === null) {
      throw new Error("Game not found");
    }
    if (oldGame.isOver) {
      throw new Error("Game already over");
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
      const [x, y] = action.cell;
      const newGame = claim(game, x, y);
      if (newGame.type === "err") {
        throw new Error(newGame.msg);
      }
      return newGame.res;
    }
    case "delegateToMediator":
      return {
        ...game,
        currentActorDelegated: true,
      };
  }
}
