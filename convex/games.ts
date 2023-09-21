import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { gameT, playerT } from "./schema";
import { whoseMove, step } from "../src/common";

export const get = query({
  args: { id: v.id("games") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const gameDistributionT = v.object({
  resources: v.union(
    v.object({ type: v.literal("exact"), value: v.number() }),
    v.object({ type: v.literal("uniform"), min: v.number(), max: v.number() }),
  ),
  board: v.object({
    type: v.literal("iid-uniform-hex-grid"),
    sideLength: v.number(),
    min: v.number(),
    max: v.number(),
  }),
});
export type GameDistribution = typeof gameDistributionT.type;

export const create = mutation({
  args: { game: gameT },
  handler: async (ctx, args) => {
    const storage = JSON.stringify(args.game).length;
    if (storage > 20000) {
      throw new Error("game too big");
    }
    return await ctx.db.insert("games", args.game);
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
