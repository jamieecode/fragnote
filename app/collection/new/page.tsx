import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS } from "@/lib/collection";
import RegisterWizard from "./RegisterWizard";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ perfumeId?: string }> }) {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const { perfumeId } = await searchParams;

  const initialPerfume = perfumeId
    ? await prisma.perfume.findUnique({ where: { id: perfumeId }, include: { brand: true } })
    : null;

  return (
    <RegisterWizard
      initialPerfume={
        initialPerfume
          ? {
              id: initialPerfume.id,
              name: initialPerfume.name,
              brand: initialPerfume.brand.name,
              tint: initialPerfume.family ? FAMILY_TINTS[initialPerfume.family] : "var(--border-soft)",
            }
          : null
      }
    />
  );
}
