"use server";

import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleWishlist(perfumeId: string): Promise<boolean> {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");

  const existing = await prisma.wishlist.findUnique({
    where: { userId_perfumeId: { userId, perfumeId } },
  });

  if (existing) {
    // 다른 탭에서 같은 항목을 거의 동시에 삭제했을 수도 있음 — 이미 없어도 에러 없이 넘어간다.
    await prisma.wishlist.deleteMany({ where: { id: existing.id } });
    revalidatePath("/recommend");
    revalidatePath("/collection");
    return false;
  }

  try {
    await prisma.wishlist.create({ data: { userId, perfumeId } });
  } catch (e) {
    // 다른 탭에서 같은 항목을 거의 동시에 먼저 추가했다면 유니크 제약 위반이 나는데,
    // 결과적으로 원하는 상태(위시리스트에 있음)에는 이미 도달했으므로 성공으로 취급한다.
    const isDuplicate = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
    if (!isDuplicate) throw e;
  }
  revalidatePath("/recommend");
  revalidatePath("/collection");
  return true;
}
