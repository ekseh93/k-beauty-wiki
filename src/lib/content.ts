export type ContentKind = "treatment" | "skincare" | "makeup";
export type ContentStatus = "draft" | "review" | "published" | "archived";

export interface ContentSource {
  title: string;
  url: string;
  checkedAt: string;
}

export interface ReviewEvidenceSummary {
  platform: string;
  sampleCount: number;
  independentSourceCount: number;
  reviewCountAtCollection: number;
  reviewWindow: string;
  collectedAt: string;
  summary: string;
  sourceUrls: string[];
}

export interface BaseContent {
  id: string;
  kind: ContentKind;
  titleJa: string;
  koreanName: string;
  slug: string;
  summary: string;
  body: string[];
  tags: string[];
  aliases: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
  sources: ContentSource[];
  reviewEvidence?: ReviewEvidenceSummary;
  relatedSlugs: string[];
  isFixture: boolean;
  caution: string;
}

export interface TreatmentContent extends BaseContent {
  kind: "treatment";
  principle: string;
  purpose: string;
  suitableFor: string[];
  consultOrAvoid: string[];
  priceRange: string;
  priceCondition: string;
  duration: string;
  downtime: string;
  maintenance: string;
  sideEffects: string[];
  similarTreatments: string[];
}

export interface ProductContent extends BaseContent {
  kind: "skincare" | "makeup";
  brand: string;
  productType: string;
  volume: string;
  price: string;
  currency: string;
  pricePerVolume: string;
  keyIngredients: { name: string; role: string }[];
  skinTypes: string[];
  usage: string[];
  pros: string[];
  considerations: string[];
  priceCheckedAt: string;
}

export type AtlasContent = TreatmentContent | ProductContent;

export const kindLabels: Record<ContentKind, string> = {
  treatment: "施術",
  skincare: "スキンケア",
  makeup: "メイクアップ",
};

const fixtureSource: ContentSource = {
  title: "開発用fixture（出典未確認）",
  url: "https://example.com/development-fixture",
  checkedAt: "2026-08-14",
};

const common = {
  status: "review" as const,
  createdAt: "2026-08-14",
  updatedAt: "2026-08-14",
  lastVerifiedAt: "未確認",
  sources: [fixtureSource],
  isFixture: true,
};

export const fixtureContent: AtlasContent[] = [
  {
    ...common,
    id: "fixture-treatment-001",
    kind: "treatment",
    titleJa: "水光注入（開発用サンプル）",
    koreanName: "물광주사",
    slug: "fixture-water-glow-treatment",
    summary: "肌への施術を検討するときに確認したい項目をまとめるための開発用サンプルです。",
    body: [
      "このページは公開前の情報設計を確認するためのfixtureです。実際の施術内容や適応は医療機関へ確認してください。",
      "本番公開時には、施術の仕組み、対象、リスク、価格条件を確認済みの一次情報とともに掲載します。",
    ],
    tags: ["施術", "保留中"],
    aliases: ["물광주사", "ウォーターピーリングではありません"],
    caution: "医療行為に関する判断は行わず、必ず有資格者へ相談してください。",
    principle: "本番公開時に確認して記載",
    purpose: "肌悩みに関する一般的な情報整理",
    suitableFor: ["相談内容に応じて個別に確認"],
    consultOrAvoid: ["妊娠中・授乳中などは医療機関へ確認"],
    priceRange: "未確認",
    priceCondition: "地域、施設、薬剤、施術範囲で変動",
    duration: "未確認",
    downtime: "未確認",
    maintenance: "未確認",
    sideEffects: ["個人差があるため医療機関で確認"],
    similarTreatments: ["類似施術は出典確認後に掲載"],
    relatedSlugs: ["fixture-centella-cream", "fixture-tint-cushion"],
  },
  {
    ...common,
    id: "fixture-skincare-001",
    kind: "skincare",
    titleJa: "ツボクサ保湿クリーム（開発用サンプル）",
    koreanName: "시카 보습 크림",
    slug: "fixture-centella-cream",
    summary: "成分の役割、使い方、価格調査日の表示例を確認するための開発用サンプルです。",
    body: [
      "本番ではブランド公式情報と販売地域ごとの表示を確認し、成分の役割を一般的な範囲で説明します。",
      "肌に合わない場合は使用を中止し、必要に応じて専門家へ相談してください。",
    ],
    tags: ["保湿", "成分から探す"],
    aliases: ["シカクリーム", "CICA cream"],
    caution: "成分の働きは肌状態や製品処方によって異なります。",
    brand: "開発用ブランド",
    productType: "保湿クリーム",
    volume: "50 g（仮）",
    price: "未確認",
    currency: "JPY",
    pricePerVolume: "未確認",
    keyIngredients: [
      { name: "ツボクサ由来成分（例）", role: "製品特徴を説明するための例" },
      { name: "保湿成分（例）", role: "うるおいを補う目的で使われる成分の例" },
    ],
    skinTypes: ["乾燥が気になる肌", "肌状態を見ながら使いたい人"],
    usage: ["洗顔後のスキンケアの最後に少量を使用（本番で確認）"],
    pros: ["成分・使い方・価格条件を比較しやすい設計"],
    considerations: ["実際の処方、価格、容量は公式情報の確認が必要"],
    priceCheckedAt: "未確認",
    relatedSlugs: ["fixture-treatment-001", "fixture-tint-cushion"],
  },
  {
    ...common,
    id: "fixture-makeup-001",
    kind: "makeup",
    titleJa: "ティントクッション（開発用サンプル）",
    koreanName: "틴트 쿠션",
    slug: "fixture-tint-cushion",
    summary: "メイクアップ製品を比較するときの基本項目を確認するための開発用サンプルです。",
    body: [
      "本番では色展開、仕上がり、容量、価格、公式使用方法を確認して掲載します。",
      "色味は画面や照明で見え方が変わるため、購入前に販売元の色見本を確認してください。",
    ],
    tags: ["ベースメイク", "色選び"],
    aliases: ["クッションファンデーション", "クッション"],
    caution: "色味や仕上がりの感じ方には個人差があります。",
    brand: "開発用ブランド",
    productType: "クッションファンデーション",
    volume: "15 g（仮）",
    price: "未確認",
    currency: "JPY",
    pricePerVolume: "未確認",
    keyIngredients: [{ name: "製品成分", role: "公式全成分表示を確認して記載" }],
    skinTypes: ["仕上がりの好みから選ぶ"],
    usage: ["少量ずつ肌にのせ、色ムラを確認しながら調整（本番で確認）"],
    pros: ["日本語・韓国語の商品名を並べて確認できる"],
    considerations: ["実際の色展開、価格、成分は公式情報の確認が必要"],
    priceCheckedAt: "未確認",
    relatedSlugs: ["fixture-centella-cream", "fixture-treatment-001"],
  },
];

export function getContentBySlug(slug: string): AtlasContent | undefined {
  return fixtureContent.find((content) => content.slug === slug);
}

export function isPublishable(content: AtlasContent): boolean {
  return content.status === "published" && !content.isFixture && content.sources.length > 0 && content.lastVerifiedAt !== "未確認";
}
