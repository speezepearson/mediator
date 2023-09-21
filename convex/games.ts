import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { playerT } from "./schema";
import { whoseMove, step, sampleFromBoardDistribution } from "../src/common";

export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const boardDistributionT = v.object({
  type: v.literal("iid-uniform-grid"),
  w: v.number(),
  h: v.number(),
  min: v.number(),
  max: v.number(),
});
export type BoardDistribution = typeof boardDistributionT.type;

export const create = mutation({
  args: {
    startingResources: v.number(),
    boardDistribution: boardDistributionT,
  },
  handler: async (ctx, args) => {
    const board = sampleFromBoardDistribution(args.boardDistribution);
    return await ctx.db.insert("games", {
      cells: board,
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
