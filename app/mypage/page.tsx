import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MyPageView from "./MyPageView";

export default async function MyPagePage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  // 세션은 유효한데 DB의 User row가 사라진 경우 — 이미 이 상황을 안내하는 루트 페이지로 보낸다.
  if (!user) redirect("/");

  return <MyPageView nickname={user.nickname} email={user.email} />;
}
