"use server";

import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS } from "@/lib/collection";

export type CatalogResult = {
  id: string;
  name: string;
  nameEn: string | null;
  brand: string;
  brandEn: string | null;
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
    nameEn: p.nameEn,
    brand: p.brand.name,
    brandEn: p.brand.nameEn,
    tint: p.family ? FAMILY_TINTS[p.family] : "var(--border-soft)",
  }));
}

// BLOB_READ_WRITE_TOKEN이 아직 없어도(로컬 개발 초기 등) 등록 자체가 막히면 안 되므로,
// 토큰이 없거나 업로드가 실패하면 사진 없이 진행하도록 null을 돌려준다 — 던지지 않음.
export async function uploadCollectionPhoto(formData: FormData): Promise<string | null> {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;

  try {
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "jpg";
    const blob = await put(`collection-photos/${userId}-${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return blob.url;
  } catch {
    return null;
  }
}

export async function createCollectionEntry(input: {
  perfumeId: string;
  isPreOwned: boolean;
  amountPercent: number;
  volumeMl: number;
  purchasedAt: string;
  price: number | null;
  photoUrl: string | null;
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
      photoUrl: input.photoUrl,
    },
  });

  return collection.id;
}
