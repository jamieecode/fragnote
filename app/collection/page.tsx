import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS, percentOf } from "@/lib/collection";
import CollectionView, { type CollectionItemVM, type WishlistItemVM } from "./CollectionView";

export default async function CollectionPage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const [collections, wishlist] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      include: { perfume: { include: { brand: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wishlist.findMany({
      where: { userId },
      include: { perfume: { include: { brand: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const ownedPerfumeIds = new Set(collections.map((c) => c.perfumeId));

  const items: CollectionItemVM[] = collections.map((c) => ({
    id: c.id,
    name: c.perfume.name,
    label: c.label,
    brand: c.perfume.brand.name,
    tint: c.perfume.family ? FAMILY_TINTS[c.perfume.family] : "var(--border-soft)",
    percent: percentOf(c.currentMl, c.totalMl),
    isEmpty: c.currentMl <= 0,
  }));

  const wishlistItems: WishlistItemVM[] = wishlist.map((w) => ({
    id: w.id,
    perfumeId: w.perfumeId,
    name: w.perfume.name,
    brand: w.perfume.brand.name,
    tint: w.perfume.family ? FAMILY_TINTS[w.perfume.family] : "var(--border-soft)",
    owned: ownedPerfumeIds.has(w.perfumeId),
  }));

  return <CollectionView items={items} wishlistItems={wishlistItems} />;
}
