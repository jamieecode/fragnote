"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recalcCollectionMl, manuallyAdjustCollection, percentOf } from "@/lib/collection";
import { revalidatePath } from "next/cache";

async function requireOwnedCollection(collectionId: string, userId: string) {
  const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!collection || collection.userId !== userId) throw new Error("컬렉션 항목을 찾을 수 없어요");
  return collection;
}

export async function updateLabel(collectionId: string, label: string) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");
  await requireOwnedCollection(collectionId, userId);

  await prisma.collection.update({
    where: { id: collectionId },
    data: { label: label === "없음" ? null : label },
  });
  revalidatePath(`/collection/${collectionId}`);
}

export async function deleteCollectionEntry(collectionId: string) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");
  await requireOwnedCollection(collectionId, userId);

  await prisma.collection.delete({ where: { id: collectionId } });
  revalidatePath("/collection");
}

export async function addUsageLog(collectionId: string, sprayCount: number, location: string) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");
  const collection = await requireOwnedCollection(collectionId, userId);

  await prisma.$transaction([
    prisma.usageLog.create({ data: { userId, collectionId, sprayCount, location } }),
    // 새 향수가 처음 사용되면 그 시점을 개봉일로 기록한다 (변질 위험도 계산의 시작점).
    ...(collection.openedAt
      ? []
      : [prisma.collection.update({ where: { id: collectionId }, data: { openedAt: new Date() } })]),
  ]);

  const currentMl = await recalcCollectionMl(collectionId);
  revalidatePath(`/collection/${collectionId}`);
  return percentOf(currentMl, collection.totalMl);
}

export async function adjustPercent(collectionId: string, percent: number) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");
  await requireOwnedCollection(collectionId, userId);

  await manuallyAdjustCollection(collectionId, percent);
  revalidatePath(`/collection/${collectionId}`);
}
