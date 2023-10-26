import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'

export const snapshotRouter = createTRPCRouter({
  listByAddress: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.doc.findMany({ where: { spaceId: input.id } })
    }),

  upsert: publicProcedure
    .input(
      z.object({
        spaceId: z.string(),
        version: z.number(),
        nodeMap: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const find = await ctx.prisma.snapshot.findUnique({
        where: { spaceId: input.spaceId },
      })

      if (!find) {
        return await ctx.prisma.snapshot.create({
          data: input,
        })
      }

      return ctx.prisma.snapshot.update({
        where: { id: find.id },
        data: input,
      })
    }),
})
