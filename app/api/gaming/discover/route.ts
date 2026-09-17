import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const knownGames: Array<{ match: RegExp; category: string; gameplayType: string; matchFormat: string; gameVariant: string; teamMode: string; gameplayGuide: string; rules: string }> = [
  { match: /jawaker|جواكر/i, category: "Card Game", gameplayType: "منصة ألعاب ورق", matchFormat: "2-4 لاعبين", gameVariant: "تركس / طرنيب / بلوت / هاند", teamMode: "فردي أو شراكة حسب اللعبة", gameplayGuide: "اختر لعبة الورق من داخل المنصة، ثم حدد نوع الجولة وقواعدها وطريقة احتساب النقاط قبل بدء البطولة.", rules: "اختر لعبة الورق وقواعدها قبل إنشاء البطولة" },
  { match: /tarneeb|طرنيب/i, category: "Card Game", gameplayType: "لعبة ورق", matchFormat: "4 لاعبين", gameVariant: "طرنيب", teamMode: "شراكة 2v2", gameplayGuide: "يلعب أربعة لاعبين على فريقين متقابلين. تبدأ الجولة بالمزايدة، ثم يحدد أعلى مزايد نوع الحكم ويحاول الفريق تحقيق عدد اللمّات المعلن.", rules: "كل فريق شريكان، والمزايدة وتحديد الحكم تسبقان اللعب" },
  { match: /trex|trix|تركس/i, category: "Card Game", gameplayType: "لعبة ورق", matchFormat: "4 لاعبين", gameVariant: "تركس", teamMode: "فردي", gameplayGuide: "يلعب كل متسابق لنفسه عبر ممالك وجولات مختلفة، ولكل مملكة هدف خاص مثل جمع الأوراق أو التخلص منها أو تجنب العقوبات.", rules: "كل لاعب يلعب لنفسه وفق المملكة أو الجولة المختارة" },
  { match: /generals|command and conquer|starcraft|age of empires/i, category: "RTS", gameplayType: "استراتيجية لحظية", matchFormat: "1v1", gameVariant: "", teamMode: "فردي", gameplayGuide: "اختيار فصيل، جمع الموارد، بناء قاعدة، تطوير التقنية، إنتاج الوحدات، ثم استخدام مزيج من القوات والهجمات الخاصة لتدمير قاعدة الخصم.", rules: "بناء قاعدة، إدارة موارد، وتوجيه الوحدات" },
  { match: /pubg|fortnite|apex legends|warzone|free fire/i, category: "Battle Royale", gameplayType: "Squad / Battle Royale", matchFormat: "Squad", gameVariant: "", teamMode: "فرق", gameplayGuide: "يهبط اللاعبون على الخريطة، يجمعون الأسلحة والمعدات، ويتعاونون داخل منطقة آمنة تتقلص تدريجياً حتى يبقى آخر لاعب أو فريق.", rules: "البقاء حتى النهاية مع إمكانية اللعب ضمن فريق" },
  { match: /counter.?strike|valorant|rainbow six|overwatch|call of duty/i, category: "FPS", gameplayType: "فرق وتكتيك", matchFormat: "5v5", gameVariant: "", teamMode: "فرق", gameplayGuide: "يتنافس فريقان في جولات بأهداف محددة. يعتمد الفوز على التعاون، إدارة الاقتصاد أو القدرات، السيطرة على المواقع، وتحقيق الهدف قبل الخصم.", rules: "جولات تنافسية تعتمد على التصويب والتعاون" },
  { match: /fifa|fc 2\d|rocket league|nba 2k/i, category: "Sports", gameplayType: "مباراة رياضية", matchFormat: "1v1 / 2v2 / 3v3", gameVariant: "", teamMode: "فردي أو فرق", gameplayGuide: "مباراة زمنية يحاول فيها اللاعب أو الفريق تسجيل أهداف أكثر من الخصم مع الالتزام بقواعد الرياضة ونظام الوقت.", rules: "منافسة مباشرة لتسجيل نقاط أكثر من الخصم" },
  { match: /hearthstone|yu.?gi.?oh|magic:|legends of runeterra/i, category: "Card Game", gameplayType: "لعبة ورق وقواعد خاصة", matchFormat: "1v1", gameVariant: "", teamMode: "فردي", gameplayGuide: "يبني كل لاعب مجموعة أوراق، ويسحب ويلعب البطاقات وفق تكلفتها وقدراتها حتى يخفض نقاط خصمه أو يحقق شرط الفوز.", rules: "بناء مجموعة بطاقات واستخدامها وفق قدرات وتكلفة كل بطاقة" },
];

function classify(title: string, extract: string) {
  const known = knownGames.find((game) => game.match.test(`${title} ${extract}`));
  return known ?? {
    category: /strategy|strategic|strategy game/i.test(`${title} ${extract}`) ? "Strategy" : "Video Game",
    gameplayType: "نظام لعب خاص يحتاج إلى مراجعة",
    matchFormat: "يحدد يدوياً",
    gameVariant: "",
    teamMode: "يحدد يدوياً",
    gameplayGuide: "لم يتم العثور على نظام موثوق لهذه اللعبة. راجع طريقة اللعب والقواعد الرسمية قبل اعتمادها.",
    rules: "راجع القواعد الرسمية للعبة قبل اعتمادها في البطولة",
  };
}

async function findCommonsImage(query: string) {
  const commonsUrl = new URL("https://commons.wikimedia.org/w/api.php");
  commonsUrl.searchParams.set("action", "query");
  commonsUrl.searchParams.set("generator", "search");
  commonsUrl.searchParams.set("gsrsearch", `${query} filetype:bitmap`);
  commonsUrl.searchParams.set("gsrnamespace", "6");
  commonsUrl.searchParams.set("gsrlimit", "1");
  commonsUrl.searchParams.set("prop", "imageinfo");
  commonsUrl.searchParams.set("iiprop", "url");
  commonsUrl.searchParams.set("iiurlwidth", "1200");
  commonsUrl.searchParams.set("format", "json");
  const response = await fetch(commonsUrl, {
    headers: { "User-Agent": "TigerGaming/1.0" },
    cache: "no-store",
  });
  if (!response.ok) return "";
  const data = (await response.json()) as {
    query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || "";
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
    searchUrl.searchParams.set("generator", "search");
    searchUrl.searchParams.set("gsrsearch", query);
    searchUrl.searchParams.set("gsrlimit", "1");
    searchUrl.searchParams.set("prop", "extracts|pageimages");
    searchUrl.searchParams.set("exintro", "1");
    searchUrl.searchParams.set("explaintext", "1");
    searchUrl.searchParams.set("piprop", "thumbnail");
    searchUrl.searchParams.set("pithumbsize", "1200");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");
    const searchResponse = await fetch(searchUrl, { headers: { "User-Agent": "TigerGaming/1.0" }, cache: "no-store" });
    if (!searchResponse.ok) throw new Error("Wikipedia search failed");
    const searchData = (await searchResponse.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string; thumbnail?: { source?: string } }> };
    };
    const page = Object.values(searchData.query?.pages ?? {})[0];
    const articleTitle = page?.title;
    if (!articleTitle) return NextResponse.json({ error: "لم يتم العثور على اللعبة" }, { status: 404 });

    const summaryResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle.replaceAll(" ", "_"))}`,
      { headers: { "User-Agent": "TigerGaming/1.0" }, cache: "no-store" }
    );
    const summary = summaryResponse.ok
      ? ((await summaryResponse.json()) as { title?: string; extract?: string; thumbnail?: { source?: string } })
      : {};
    const title = summary.title || articleTitle;
    const description = page?.extract?.trim() || summary.extract?.trim() || `معلومات أولية عن ${title}. راجع التفاصيل قبل اعتماد اللعبة.`;
    const classification = classify(title, description);
    let imageUrl = page?.thumbnail?.source || summary.thumbnail?.source || "";
    if (!imageUrl) imageUrl = await findCommonsImage(title);
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