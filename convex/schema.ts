import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const actorT = v.union(v.literal("red"), v.literal("blue"));
export type Actor = typeof actorT.type;

export const playerT = v.union(actorT, v.literal("mediator"));
export type Player = typeof playerT.type;

export const gameT = v.object({
  remainingResources: v.object({ red: v.number(), blue: v.number() }),
  currentActor: actorT,
  lastActorPassed: v.boolean(),
  isOver: v.boolean(),
  currentActorDelegated: v.boolean(),
  cells: v.array(
    v.array(
      v.object({
        occupier: v.optional(
          v.object({
            actor: actorT,
            mediated: v.boolean(),
          }),
        ),
        worth: v.object({
          red: v.number(),
          blue: v.number(),
        }),
      }),
    ),
  ),
});
export type Game = typeof gameT.type;

export default defineSchema({
  games: defineTable(gameT),
});
