"use server";

import type { NoteFamily } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeFamilyWeights } from "./taste-weights";

export async function applyTastePreferences(userId: string, answers: NoteFamily[][]) {
  const counts = computeFamilyWeights(answers);

  const notes =
    counts.size === 0
      ? []
      : await prisma.note.findMany({
          where: { family: { in: [...counts.keys()] } },
          select: { id: true, family: true },
        });

  // 온보딩을 다시 하면 이전 취향을 "대체"하는 것으로 기대하므로(마이페이지 문구도
  // "다시 설정"), 매번 기존 preference를 전부 지운 뒤 이번 답변만 새로 반영한다.
  // 지우기+새로 쓰기를 같은 트랜잭션에 묶어서 중간에 실패해도 부분 상태가 남지 않게
  // 하고, 방금 지웠으므로 충돌 걱정 없이 upsert 대신 create로 바로 넣는다.
  await prisma.$transaction(
    [
      prisma.userNotePreference.deleteMany({ where: { userId } }),
      ...notes.map((note) =>
        prisma.userNotePreference.create({
          data: { userId, noteId: note.id, weight: counts.get(note.family)! },
        })
      ),
    ],
    { timeout: 15000 }
  );
}

export async function saveTastePreferences(answers: NoteFamily[][]) {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");
  await applyTastePreferences(userId, answers);
}
