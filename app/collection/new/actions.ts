"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS } from "@/lib/collection";

export type CatalogResult = {
  id: string;
  name: string;
  brand: string;
  tint: string;
};

export async function searchCatalog(query: string): Promise<CatalogResult[]> {
  const q = query.trim();

  const perfumes = await prisma.perfume.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { brand: { name: { contains: q, mode: "insensitive" } } },
            { brand: { nameEn: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { brand: true },
    orderBy: { name: "asc" },
    take: 8,
  });

  return perfumes.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand.name,
    tint: p.family ? FAMILY_TINTS[p.family] : "var(--border-soft)",
  }));
}

export async function createCollectionEntry(input: {
  perfumeId: string;
  isPreOwned: boolean;
  amountPercent: number;
  volumeMl: number;
  purchasedAt: string;
  price: number | null;
}) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");

  const totalMl = input.volumeMl > 0 ? input.volumeMl : 1;
  const percent = input.isPreOwned ? Math.max(0, Math.min(100, input.amountPercent)) : 100;
  const ml = (percent / 100) * totalMl;
  const purchasedAt = input.purchasedAt ? new Date(input.purchasedAt) : null;
  // 이미 쓰던 향수는 등록 시점 이전에 이미 개봉된 상태로 본다 (구매일이 있으면 그 날짜를,
  // 없으면 오늘을 개봉일로 잠정 사용). 새 향수는 아직 미개봉이라 openedAt은 null로 둔다.
  const openedAt = input.isPreOwned ? purchasedAt ?? new Date() : null;

  const collection = await prisma.collection.create({
    data: {
      userId,
      perfumeId: input.perfumeId,
      totalMl,
      initialMl: ml,
      currentMl: ml,
      isPreOwned: input.isPreOwned,
      openedAt,
      purchasedAt,
      price: input.price,
    },
  });

  return collection.id;
}
