// 향수 카탈로그 노트 반자동 생성 스크립트
//
// 사용법:
//   1. npm install xlsx @anthropic-ai/sdk
//   2. ANTHROPIC_API_KEY 환경변수 설정
//   3. node generate-notes.mjs ./향수_카탈로그_체크리스트.xlsx
//
// 동작:
//   - '리스트' 시트에서 status가 '미착수'인 행만 골라 Claude에게 노트 구성을 물어봄
//   - 응답을 note_top/middle/base(한글+영문), family(한글+영문)에 채움
//   - status를 '초안생성'으로 변경 (검증 전 단계임을 표시 — 브랜드 공식 페이지 대조는 여전히 필요)
//   - 결과를 원본 파일명 + '_초안' 이름으로 별도 저장 (원본 보존)
//
// 주의:
//   - LLM 생성 결과는 반드시 브랜드 공식 페이지와 대조 검증 후 status를 '검증완료'로 바꿔야 함
//   - API 호출 비용이 발생하므로, 먼저 5~10개로 테스트해보는 것을 권장 (아래 LIMIT 값 조정)
//   - 이 스크립트의 출력은 엑셀 체크리스트용 중간 산출물임. family/family_en 값은
//     "우디"/"Woody" 같은 표시용 문자열이라, Prisma seed script로 넘길 때
//     schema.prisma의 NoteFamily enum(WOODY, CITRUS 등)으로 별도 정규화가 필요함

import XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const INPUT_PATH = process.argv[2];
if (!INPUT_PATH) {
  console.error("사용법: node generate-notes.mjs <체크리스트.xlsx>");
  process.exit(1);
}

// 테스트 시 작게 잡고, 전체 실행할 땐 Infinity로 변경
const LIMIT = 10;
const CONCURRENCY = 3; // 동시 요청 수 (레이트리밋 방지)

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 자동 사용

const FAMILY_OPTIONS = [
  "시트러스", "플로럴", "우디", "오리엔탈/앰버", "프레시", "푸제르", "시프레", "구르망",
];

function buildPrompt(brand, brandEn, name, nameEn) {
  return `당신은 향수 전문가입니다. 아래 향수의 노트 구성을 알고 있는 지식 범위 내에서 최대한 정확하게 알려주세요.

브랜드: ${brand} (${brandEn || ""})
제품명: ${name} (${nameEn || ""})

다음 JSON 형식으로만 답하세요. 다른 설명은 절대 추가하지 마세요.
확실하지 않은 정보는 빈 문자열로 남겨두세요 (추측해서 지어내지 마세요).

{
  "note_top": "한글 노트, 쉼표로 구분",
  "note_top_en": "영문 노트, comma separated",
  "note_middle": "한글 노트, 쉼표로 구분",
  "note_middle_en": "영문 노트, comma separated",
  "note_base": "한글 노트, 쉼표로 구분",
  "note_base_en": "영문 노트, comma separated",
  "family": "다음 중 하나: ${FAMILY_OPTIONS.join(" / ")}",
  "family_en": "Citrus / Floral / Woody / Oriental Amber / Fresh / Fougere / Chypre / Gourmand 중 하나",
  "gender": "여성 / 남성 / 남녀공용 중 하나",
  "confidence": "high / medium / low"
}`;
}

async function generateOne(row) {
  const prompt = buildPrompt(row.brand, row.brand_en, row.name, row.name_en);

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      const text = msg.content.find((b) => b.type === "text")?.text ?? "";
      const cleaned = text.replace(/```json|```/g, "").trim();

      try {
        return JSON.parse(cleaned);
      } catch (e) {
        console.warn(`⚠️  파싱 실패: ${row.brand} ${row.name} — 원문 응답:`, text);
        return null;
      }
    } catch (err) {
      lastErr = err;
      const isRetryable = err.status === 429 || (err.status >= 500 && err.status < 600);
      if (!isRetryable || attempt === 3) break;
      const backoffMs = 1000 * attempt;
      console.warn(`  재시도 ${attempt}/3 (${backoffMs}ms 대기): ${err.message}`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

async function runBatched(rows, worker, concurrency) {
  const results = new Array(rows.length);
  let cursor = 0;

  async function next() {
    while (cursor < rows.length) {
      const i = cursor++;
      console.log(`[${i + 1}/${rows.length}] ${rows[i].brand} - ${rows[i].name}`);
      try {
        results[i] = await worker(rows[i]);
      } catch (err) {
        console.error(`  ❌ 실패: ${err.message}`);
        results[i] = null;
      }
      // 레이트리밋 여유를 위한 짧은 대기
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, next));
  return results;
}

async function main() {
  const wb = XLSX.readFile(INPUT_PATH);
  const sheet = wb.Sheets["리스트"];
  if (!sheet) {
    console.error(`'리스트' 시트를 찾을 수 없어요. 시트 이름을 확인해주세요. (현재 파일의 시트: ${wb.SheetNames.join(", ")})`);
    process.exit(1);
  }
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (data.length === 0) {
    console.error("'리스트' 시트에 데이터가 없어요.");
    process.exit(1);
  }

  // 헤더 순서 보존을 위해 원본 컬럼 순서 기억
  const headers = Object.keys(data[0]);

  const targets = data
    .map((row, idx) => ({ ...row, __idx: idx }))
    .filter((row) => row.status === "미착수")
    .slice(0, LIMIT);

  console.log(`대상: ${targets.length}개 (전체 미착수 중 LIMIT=${LIMIT}개만 처리)`);

  const results = await runBatched(targets, generateOne, CONCURRENCY);

  let successCount = 0;
  results.forEach((result, i) => {
    if (!result) return;
    const originalIdx = targets[i].__idx;
    data[originalIdx].note_top = result.note_top || "";
    data[originalIdx].note_top_en = result.note_top_en || "";
    data[originalIdx].note_middle = result.note_middle || "";
    data[originalIdx].note_middle_en = result.note_middle_en || "";
    data[originalIdx].note_base = result.note_base || "";
    data[originalIdx].note_base_en = result.note_base_en || "";
    data[originalIdx].family = result.family || "";
    data[originalIdx].family_en = result.family_en || "";
    data[originalIdx].gender = result.gender || "";
    data[originalIdx].status = "초안생성";
    if (result.confidence === "low") {
      data[originalIdx].status = "초안생성(낮은 신뢰도-우선 검증)";
    }
    successCount++;
  });

  console.log(`\n완료: ${successCount}/${targets.length}개 초안 생성`);

  // 새 시트로 저장 (원본 파일은 보존)
  const newSheet = XLSX.utils.json_to_sheet(data, { header: headers });
  wb.Sheets["리스트"] = newSheet;

  const outPath = INPUT_PATH.replace(/\.xlsx$/, "_초안.xlsx");
  XLSX.writeFile(wb, outPath);
  console.log(`저장됨: ${outPath}`);
  console.log(`\n⚠️  생성된 초안은 브랜드 공식 페이지와 대조 검증 후 status를 '검증완료'로 변경해주세요.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
