import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS, FAMILY_LABELS } from "@/lib/collection";
import PerfumeDetailView from "./PerfumeDetailView";

const POSITION_LABELS = { TOP: "탑 노트", MIDDLE: "미들 노트", BASE: "베이스 노트" } as const;

export default async function PerfumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const { id } = await params;

  const perfume = await prisma.perfume.findUnique({
    where: { id },
    include: {
      brand: true,
      notes: { include: { note: true }, orderBy: [{ position: "asc" }, { intensity: "desc" }] },
    },
  });
  if (!perfume) notFound();

  const [owned, wished, similar] = await Promise.all([
    prisma.collection.findFirst({ where: { userId, perfumeId: id }, select: { id: true } }),
    prisma.wishlist.findUnique({ where: { userId_perfumeId: { userId, perfumeId: id } } }),
    perfume.family
      ? prisma.perfume.findMany({
          where: { family: perfume.family, id: { not: id } },
          include: { brand: true },
          orderBy: { name: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const noteSections = (["TOP", "MIDDLE", "BASE"] as const).map((position) => ({
    label: POSITION_LABELS[position],
    notes: perfume.notes.filter((n) => n.position === position).map((n) => ({ name: n.note.name, intensity: n.intensity })),
  }));

  return (
    <PerfumeDetailView
      perfumeId={perfume.id}
      name={perfume.name}
      nameEn={perfume.nameEn}
      brand={perfume.brand.name}
      brandEn={perfume.brand.nameEn}
      tint={perfume.family ? FAMILY_TINTS[perfume.family] : "var(--border-soft)"}
      familyLabel={perfume.family ? FAMILY_LABELS[perfume.family] : "미분류"}
      noteSections={noteSections}
      owned={!!owned}
      initialWished={!!wished}
      similar={similar.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand.name,
        tint: p.family ? FAMILY_TINTS[p.family] : "var(--border-soft)",
      }))}
    />
  );
}
