import { prisma } from '../db/client'
import type { Source } from '@prisma/client'

export type { Source }

export async function getAll(): Promise<Source[]> {
  return prisma.source.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getActive(): Promise<Source[]> {
  return prisma.source.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getById(id: string): Promise<Source | null> {
  return prisma.source.findUnique({ where: { id } })
}

export async function create(data: {
  name: string
  type: string
  url: string
  parseInterval?: number
}): Promise<Source> {
  return prisma.source.create({
    data: {
      name: data.name,
      type: data.type,
      url: data.url,
      parseInterval: data.parseInterval || 3600,
    },
  })
}

export async function updateLastParsed(id: string): Promise<void> {
  await prisma.source.update({
    where: { id },
    data: { lastParsedAt: new Date() },
  })
}

export async function toggle(id: string, isActive: boolean): Promise<Source> {
  return prisma.source.update({
    where: { id },
    data: { isActive },
  })
}

export async function remove(id: string): Promise<void> {
  await prisma.source.delete({ where: { id } })
}
