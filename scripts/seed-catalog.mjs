// 향수 카탈로그 DB 시딩 스크립트
//
// 사용법:
//   node scripts/seed-catalog.mjs [체크리스트.xlsx]
//   (인자 생략 시 scripts/data/perfume-catalog-checklist-draft.xlsx 사용)
//
// 동작:
//   - '리스트' 시트에서 note_top/middle/base가 채워진 행만 시딩 대상으로 삼음
//     (status가 '미착수'인 완전 빈 행은 건너뜀)
//   - Brand: name 기준 upsert
//   - Note: 정규화된 영문 이름(공백/대소문자/하이픈 무시) 기준 dedup — 체크리스트
//     '안내' 시트에 영문 표기가 추천 엔진 canonical key라 명시되어 있음. 표시용
//     한글 이름(name)은 같은 영문 그룹 내 최빈값 사용 — 개별 행의 한글/영문
//     리스트가 밀려서 짝이 어긋난 경우(드묾, 예: 톰포드 블랙 오키드 note_middle)에도
//     같은 영문 키를 공유하는 다른 정상 행들이 다수면 자연히 다수결로 보정됨
//   - Note.family: 영문 노트명 키워드 기반 규칙으로 분류 (NOTE_FAMILY_RULES)
//   - Perfume.family: 행의 family_en 값을 NoteFamily enum으로 매핑
//   - PerfumeNote.intensity: 같은 position 내 등장 순서 기준 5→1 감소값 부여
//
// 주의:
//   - status가 '초안생성'류(LLM 초안, 미검증)인 행도 포함해서 시딩함 — MVP
//     개발에 필요한 데이터량 확보가 우선이고, 브랜드 공식 페이지 대조 검증은
//     별도 진행 후 xlsx의 status를 갱신하면 됨 (검증 여부가 시딩 여부를 막지 않음)
//   - 재실행 시 기존 데이터를 지우지 않고 upsert/skip으로 누적 반영됨

import "dotenv/config";
import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const INPUT_PATH =
  process.argv[2] || "scripts/data/perfume-catalog-checklist-draft.xlsx";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const GENDER_MAP = {
  여성: "FEMALE",
  남성: "MALE",
  남녀공용: "UNISEX",
};

const PERFUME_FAMILY_MAP = {
  시트러스: "CITRUS",
  플로럴: "FLORAL",
  우디: "WOODY",
  "오리엔탈/앰버": "ORIENTAL_AMBER",
  오리엔탈: "ORIENTAL_AMBER",
  앰버: "ORIENTAL_AMBER",
  프레시: "FRESH",
  푸제르: "FOUGERE",
  시프레: "CHYPRE",
  구르망: "GOURMAND",
};

// 정확히 일치하지 않으면(예: 수기 검증 행의 "플로럴 오리엔탈"/"우디 오리엔탈" 같은
// 복합 표기) 문자열에서 가장 먼저 등장하는 키로 매칭 — "X Y" 표기 관례상 앞쪽이
// 주계열이므로, 매칭 위치가 아니라 키 선언 순서로 승자가 갈리는 걸 방지한다
function resolvePerfumeFamily(raw) {
  if (!raw) return null;
  if (PERFUME_FAMILY_MAP[raw]) return PERFUME_FAMILY_MAP[raw];
  let bestKey = null;
  let bestIndex = Infinity;
  for (const k of Object.keys(PERFUME_FAMILY_MAP)) {
    const idx = raw.indexOf(k);
    if (idx !== -1 && idx < bestIndex) {
      bestIndex = idx;
      bestKey = k;
    }
  }
  return bestKey ? PERFUME_FAMILY_MAP[bestKey] : null;
}

// 순서 우선: 먼저 매치되는 규칙이 채택됨. blossom(꽃)은 과일/시트러스보다 먼저 체크.
const NOTE_FAMILY_RULES = [
  [/blossom/i, "FLORAL"],
  [
    /wood|cedar|sandal|patchouli|vetiver|\boud\b|aoud|guaiac|mahogany|birch|bamboo|driftwood|leather|suede|oakmoss|palo santo|olive tree|cashmeran|cypress|cypriol|fir resin|\bpine\b|juniper|elemi|galbanum/i,
    "WOODY",
  ],
  [
    /chocolate|cacao|cocoa|coffee|caramel|praline|panna cotta|marshmallow|\bsugar\b|honey|almond|licorice|\brum\b|chestnut|truffle|coconut/i,
    "GOURMAND",
  ],
  [
    /ambe?r|musk|civet|labdanum|benzoin|balsam|opoponax|olibanum|frankincense|incense|styrax|vanilla|tonka|coumarin|saffron|cardamom|cinnamon|clove|nutmeg|anise|pimento|\bpepper\b|oregano|cumin|caraway|tobacco|flint|powdery|\bspice|ginger/i,
    "ORIENTAL_AMBER",
  ],
  [/bergamot|lemon|\blime\b|orange|mandarin|grapefruit|cedrat|citrus|yuzu/i, "CITRUS"],
  [
    /\brose\b|jasmine|tuberose|ylang|lily|muguet|magnolia|peony|freesia|gardenia|hyacinth|violet|mimosa|wisteria|carnation|iris|orris|orchid|tulip|marigold|tagetes|flower|frangipani|heliotrope|geranium|pelargonium|lotus|nenuphar|cyclamen|neroli|griotte|tiare|bouvardia/i,
    "FLORAL",
  ],
];

function classifyNoteFamily(nameEn, nameKo) {
  const target = nameEn || nameKo || "";
  for (const [re, family] of NOTE_FAMILY_RULES) {
    if (re.test(target)) return family;
  }
  return "FRESH"; // 기본값: 그린/마린/허브/과일 등 나머지
}

function splitList(raw) {
  return (raw || "")
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeEn(en) {
  return en.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function main() {
  const wb = XLSX.readFile(INPUT_PATH);
  const sheet = wb.Sheets["리스트"];
  if (!sheet) {
    console.error(`'리스트' 시트를 찾을 수 없어요. (시트 목록: ${wb.SheetNames.join(", ")})`);
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const targets = rows.filter(
    (r) => splitList(r.note_top).length || splitList(r.note_middle).length || splitList(r.note_base).length
  );
  console.log(`전체 ${rows.length}행 중 시딩 대상 ${targets.length}행 (노트 데이터 있는 행)`);

  // 1) 노트 영문 정규화 키 기준 한글/영문 최빈 표기 집계
  const noteFreq = new Map(); // normEn -> { ko: Map<string, count>, en: Map<string, count> }
  for (const row of targets) {
    for (const field of ["note_top", "note_middle", "note_base"]) {
      const kos = splitList(row[field]);
      const ens = splitList(row[field + "_en"]);
      kos.forEach((ko, i) => {
        const en = ens[i] || "";
        const normEn = normalizeEn(en) || ko; // 영문이 아예 없으면 한글로 폴백 키 사용
        if (!noteFreq.has(normEn)) noteFreq.set(normEn, { ko: new Map(), en: new Map() });
        const g = noteFreq.get(normEn);
        g.ko.set(ko, (g.ko.get(ko) || 0) + 1);
        if (en) g.en.set(en, (g.en.get(en) || 0) + 1);
      });
    }
  }
  const mostFrequent = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const totalCount = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`고유 노트(영문 정규화 기준) ${noteFreq.size}개 발견`);

  // 2) Note upsert — 정규화 영문 키 그룹마다 최빈 한글/영문 표기로 대표 레코드 생성.
  // Note.name(한글)은 DB에서 유니크라, 서로 다른 영문 그룹이 우연히 같은 최빈 한글
  // 표기를 고르면(예: "우드"를 공유하는 Wood/Oud/Aoud) 그대로 upsert할 경우 하나로
  // 합쳐지며 데이터가 유실됨 — 등장 빈도가 높은 그룹이 원래 한글명을 갖고, 나머지
  // 충돌 그룹은 "한글명 (영문명)"으로 구분해 별도 레코드를 보장한다.
  const groups = [...noteFreq.entries()]
    .map(([normEn, g]) => ({ normEn, ko: mostFrequent(g.ko), en: mostFrequent(g.en), count: totalCount(g.ko) }))
    .sort((a, b) => b.count - a.count);
  const usedKo = new Set();
  const noteIdByNormEn = new Map();
  for (const { normEn, ko, en } of groups) {
    const displayKo = usedKo.has(ko) ? `${ko} (${en || normEn})` : ko;
    usedKo.add(displayKo);
    const family = classifyNoteFamily(en, ko);
    const note = await prisma.note.upsert({
      where: { name: displayKo },
      update: { nameEn: en || null, family },
      create: { name: displayKo, nameEn: en || null, family },
    });
    noteIdByNormEn.set(normEn, note.id);
  }

  // 3) Brand upsert
  const brandIdByName = new Map();
  for (const row of targets) {
    if (brandIdByName.has(row.brand)) continue;
    const brand = await prisma.brand.upsert({
      where: { name: row.brand },
      update: { nameEn: row.brand_en || null },
      create: { name: row.brand, nameEn: row.brand_en || null },
    });
    brandIdByName.set(row.brand, brand.id);
  }
  console.log(`브랜드 ${brandIdByName.size}개 upsert 완료`);

  // 4) Perfume + PerfumeNote upsert
  let perfumeCount = 0;
  for (const row of targets) {
    const brandId = brandIdByName.get(row.brand);
    const family = resolvePerfumeFamily(row.family);
    const targetGender = GENDER_MAP[row.gender] || null;
    const volumeMl = Number(row.volume_ml) || null;

    const perfume = await prisma.perfume.upsert({
      where: { brandId_name: { brandId, name: row.name } },
      update: { nameEn: row.name_en || null, family, targetGender, volumeMl },
      create: {
        brandId,
        name: row.name,
        nameEn: row.name_en || null,
        family,
        targetGender,
        volumeMl,
      },
    });

    // 기존 PerfumeNote 재시딩 시 중복 방지를 위해 삭제 후 재생성
    await prisma.perfumeNote.deleteMany({ where: { perfumeId: perfume.id } });

    for (const [field, position] of [
      ["note_top", "TOP"],
      ["note_middle", "MIDDLE"],
      ["note_base", "BASE"],
    ]) {
      const kos = splitList(row[field]);
      const ens = splitList(row[field + "_en"]);
      const seenPositions = new Set(); // 같은 (position, noteId) 중복 방지 (동의어가 같은 그룹으로 합쳐진 경우)
      for (let i = 0; i < kos.length; i++) {
        const normEn = normalizeEn(ens[i] || "") || kos[i];
        const noteId = noteIdByNormEn.get(normEn);
        if (!noteId || seenPositions.has(noteId)) continue;
        seenPositions.add(noteId);
        const intensity = Math.max(1, 5 - i);
        await prisma.perfumeNote.create({
          data: { perfumeId: perfume.id, noteId, position, intensity },
        });
      }
    }

    perfumeCount++;
  }

  console.log(`\n완료: 향수 ${perfumeCount}개 시딩됨 (브랜드 ${brandIdByName.size}개, 노트 ${noteIdByNormEn.size}개)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
