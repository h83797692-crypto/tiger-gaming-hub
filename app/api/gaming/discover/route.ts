import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const knownGames: Array<{ match: RegExp; category: string; gameplayType: string; rules: string }> = [
  { match: /generals|command and conquer|starcraft|age of empires/i, category: "RTS", gameplayType: "استراتيجية لحظية", rules: "بناء قاعدة، إدارة موارد، وتوجيه الوحدات" },
  { match: /pubg|fortnite|apex legends|warzone|free fire/i, category: "Battle Royale", gameplayType: "Squad / Battle Royale", rules: "البقاء حتى النهاية مع إمكانية اللعب ضمن فريق" },
  { match: /counter.?strike|valorant|rainbow six|overwatch|call of duty/i, category: "FPS", gameplayType: "فرق وتكتيك", rules: "جولات تنافسية تعتمد على التصويب والتعاون" },
  { match: /fifa|fc 2\d|rocket league|nba 2k/i, category: "Sports", gameplayType: "مباراة رياضية", rules: "منافسة مباشرة لتسجيل نقاط أكثر من الخصم" },
  { match: /hearthstone|yu.?gi.?oh|magic:|legends of runeterra/i, category: "Card Game", gameplayType: "لعبة ورق وقواعد خاصة", rules: "بناء مجموعة بطاقات واستخدامها وفق قدرات وتكلفة كل بطاقة" },
];

function classify(title: string, extract: string) {
  const known = knownGames.find((game) => game.match.test(`${title} ${extract}`));
  return known ?? {
    category: /strategy|strategic|strategy game/i.test(`${title} ${extract}`) ? "Strategy" : "Video Game",
    gameplayType: "نظام لعب خاص يحتاج إلى مراجعة",
    rules: "راجع القواعد الرسمية للعبة قبل اعتمادها في البطولة",
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2 || query.length > 120) {
    return NextResponse.json({ error: "اكتب اسم لعبة صحيحاً" }, { status: 400 });
  }

  try {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", query);
    searchUrl.searchParams.set("srlimit", "1");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");
    const searchResponse = await fetch(searchUrl, { headers: { "User-Agent": "TigerGaming/1.0" }, cache: "no-store" });
    if (!searchResponse.ok) throw new Error("Wikipedia search failed");
    const searchData = (await searchResponse.json()) as { query?: { search?: Array<{ title: string }> } };
    const articleTitle = searchData.query?.search?.[0]?.title;
    if (!articleTitle) return NextResponse.json({ error: "لم يتم العثور على اللعبة" }, { status: 404 });

    const summaryResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle.replaceAll(" ", "_"))}`,
      { headers: { "User-Agent": "TigerGaming/1.0" }, cache: "no-store" }
    );
    const summary = summaryResponse.ok
      ? ((await summaryResponse.json()) as { title?: string; extract?: string; thumbnail?: { source?: string } })
      : {};
    const title = summary.title || articleTitle;
    const description = summary.extract?.trim() || `معلومات أولية عن ${title}. راجع التفاصيل قبل اعتماد اللعبة.`;
    const classification = classify(title, description);
    const imageUrl = summary.thumbnail?.source || "";
    return NextResponse.json({
      result: {
        title,
        ...classification,
        platform: "PC / Console",
        description,
        imageUrl,
        iconUrl: imageUrl,
      },
    });
  } catch (error) {
    console.error("Failed to discover game", error);
    return NextResponse.json({ error: "تعذر البحث عن اللعبة حالياً" }, { status: 502 });
  }
}