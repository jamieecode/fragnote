import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS, FAMILY_LABELS, percentOf, riskFor, openedMonthsLabel } from "@/lib/collection";
import DetailView from "./DetailView";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: { perfume: { include: { brand: true } }, usageLogs: { orderBy: { date: "desc" } } },
  });

  if (!collection || collection.userId !== userId) notFound();

  const risk = riskFor(collection.openedAt);

  return (
    <DetailView
      collectionId={collection.id}
      item={{
        name: collection.perfume.name,
        brand: collection.perfume.brand.name,
        tint: collection.perfume.family ? FAMILY_TINTS[collection.perfume.family] : "var(--border-soft)",
        familyLabel: collection.perfume.family ? FAMILY_LABELS[collection.perfume.family] : "미분류",
        photoUrl: collection.photoUrl,
        isPreOwned: collection.isPreOwned,
        label: collection.label,
        percent: percentOf(collection.currentMl, collection.totalMl),
        wasManuallyAdjusted: collection.lastAdjustedAt !== null,
      }}
      openedMonths={openedMonthsLabel(collection.openedAt)}
      risk={risk}
      logs={collection.usageLogs.map((log) => ({
        id: log.id,
        date: log.date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
        location: log.location ?? "미기록",
        sprays: log.sprayCount,
      }))}
    />
  );
}
