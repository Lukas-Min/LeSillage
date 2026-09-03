import { describe, expect, it } from "vitest";
import { parseFragranticaHtml, parseFragranticaJson } from "../fragrantica";

// Fixture is a trimmed excerpt of Fragrantica's actual current markup
// (captured 2026, https://www.fragrantica.com/perfume/Khadlaj-Perfumes/La-Fede-Aura-Kiss-of-Rose-99107.html)
// — the site's redesign broke every marker the old regex-based parser
// relied on (h1 no longer wraps the name in an <a>, "Description"/"Gender"/
// "Concentration"/"main_accords" text markers no longer exist at all, and
// the note-pyramid's headings no longer share an enclosing <div> with their
// note links). This locks in the fix against a future silent regression.
const FIXTURE_HTML = `
<h1 itemprop="name" class="text-2xl">
    La Fede Aura Kiss of Rose Khadlaj Perfumes
    <span class="text-lg text-pink-600">for women</span>
</h1>
<p itemprop="brand" itemscope>
  <a itemprop="url" href="/designers/Khadlaj-Perfumes.html">
    <span itemprop="name">Khadlaj Perfumes</span>
  </a>
</p>
<div class="flex flex-col items-center pb-4">
  <h6 class="text-sm font-semibold">main accords</h6>
  <div class="flex flex-col w-full">
    <div class="w-full"><div style="width: 100%;"><span class="truncate">fruity</span></div></div>
    <div class="w-full"><div style="width: 49%;"><span class="truncate">fresh</span></div></div>
  </div>
  <a href="/accords-search/?fruity=100&amp;fresh=28&amp;f_from_perfume_id=99107&amp;f_gender=female%2Cunisex">Search by accords</a>
</div>
<div id="perfume-description-content" itemprop="description">
  <p><b>La Fede Aura Kiss of Rose</b> by <b>Khadlaj Perfumes</b> is a Floral Fruity fragrance for women. Top notes are Apple, Black Currant, Lychee and Grapefruit; middle notes are Raspberry, Rose and Jasmine; base notes are Musk, Vanilla and Amber. </p>
</div>
<div id="pyramid">
  <div class="mx-auto max-w-md">
    <h4 class="text-center relative"><span class="inline-block">Top Notes</span></h4>
    <div class="flex flex-wrap">
      <a href="https://beta.fragrantica.com/notes/Apple-146.html" class="pyramid-note-link">
        <div><img alt="Apple" src="t.146.jpg"></div>
        <span class="pyramid-note-label">Apple</span>
      </a>
    </div>
  </div>
</div>
<p itemprop="aggregateRating">
  Perfume rating <span itemprop="ratingValue">4.26</span> out of <span itemprop="bestRating">5</span>
  with <span itemprop="ratingCount" content="112">112</span> votes
</p>
<meta property="og:image" content="https://fimgs.net/mdimg/perfume/375x500.99107.jpg">
`;

const SAUVAGE_FIXTURE_HTML = `
<h1 itemprop="name">Sauvage Dior <span>for men</span></h1>
<div itemprop="description">
<p><b>Sauvage</b> by <b>Dior</b> is a Aromatic Fougere fragrance for men. <b>Sauvage</b> was launched in 2015. The nose behind this fragrance is François Demachy. Top notes are Calabrian bergamot and Pepper; middle notes are Sichuan Pepper, Lavender, Pink Pepper, Vetiver, Patchouli, Geranium and elemi; base notes are Ambroxan, Cedar and Labdanum. </p>
</div>
<meta property="og:image" content="https://fimgs.net/mdimg/perfume/375x500.31861.jpg">
`;

// A second real fixture (Yves Saint Laurent, Libre Eau de Toilette) covering
// two things the Khadlaj fixture doesn't: the "X was created by A and B"
// perfumer phrasing (as opposed to "the nose behind this fragrance is X"),
// and a popular fragrance's longer accord-bar list, which pushes the
// "Search by accords" link's actual position well past a too-small search
// window — this exact page is what caught that window being too small.
const LIBRE_FIXTURE_HTML = `
<h1 itemprop="name">Libre Eau de Toilette Yves Saint Laurent <span>for women</span></h1>
<div class="flex flex-col items-center pb-4">
  <h6 class="text-sm font-semibold">main accords</h6>
  <div class="flex flex-col w-full">
    ${"<div class=\"w-full\"><div style=\"width: 10%;\"><span class=\"truncate\">filler</span></div></div>".repeat(40)}
  </div>
  <a href="/accords-search/?white+floral=100&amp;citrus=83&amp;lavender=51&amp;floral=44&amp;fresh=36&amp;musky=33&amp;vanilla=32&amp;sweet=32&amp;f_from_perfume_id=65936&amp;f_gender=female%2Cunisex">Search by accords</a>
</div>
<div itemprop="description">
<p><b>Libre Eau de Toilette</b> by <b>Yves Saint Laurent</b> is a Floral fragrance for women. <b>Libre Eau de Toilette</b> was launched in 2021. Libre Eau de Toilette was created by Anne Flipo and Carlos Benaïm. Top notes are Lavender, Bergamot and Mandarin Orange; middle notes are Orange Blossom, Jasmine Tea and Jasmine; base notes are Musk, Vanilla and Ambergris. </p>
</div>
`;

describe("parseFragranticaHtml", () => {
  it("extracts name and brand from the description paragraph's bold tags, not the h1", () => {
    const parsed = parseFragranticaHtml(FIXTURE_HTML);
    expect(parsed.name).toBe("La Fede Aura Kiss of Rose");
    expect(parsed.brand).toBe("Khadlaj Perfumes");
  });

  it("extracts gender from the summary sentence", () => {
    expect(parseFragranticaHtml(FIXTURE_HTML).gender).toBe("women");
  });

  it("extracts all three note tiers from the summary sentence, including multi-word notes", () => {
    const parsed = parseFragranticaHtml(FIXTURE_HTML);
    expect(parsed.notes).toEqual({
      top: ["Apple", "Black Currant", "Lychee", "Grapefruit"],
      middle: ["Raspberry", "Rose", "Jasmine"],
      base: ["Musk", "Vanilla", "Amber"],
    });
  });

  it("extracts multi-word notes correctly from the pyramid fallback when the summary has none", () => {
    const html = FIXTURE_HTML.replace(
      /<p><b>La Fede[\s\S]*?<\/p>/,
      "<p><b>La Fede Aura Kiss of Rose</b> by <b>Khadlaj Perfumes</b> is a fragrance for women.</p>",
    );
    const parsed = parseFragranticaHtml(html);
    expect(parsed.notes?.top).toEqual(["Apple"]);
  });

  it("extracts accords with their percentages from the accords-search link, not the bar widths", () => {
    const parsed = parseFragranticaHtml(FIXTURE_HTML);
    expect(parsed.accords).toEqual([
      { name: "fruity", strength: 100, color: null },
      { name: "fresh", strength: 28, color: null },
    ]);
  });

  it("extracts rating value and count from the itemprop attributes", () => {
    const parsed = parseFragranticaHtml(FIXTURE_HTML);
    expect(parsed.ratingValue).toBe(4.26);
    expect(parsed.ratingCount).toBe(112);
  });

  it("extracts the image from og:image", () => {
    expect(parseFragranticaHtml(FIXTURE_HTML).imageUrl).toBe("https://fimgs.net/mdimg/perfume/375x500.99107.jpg");
  });

  it("extracts year and perfumer(s) from the summary sentence when present", () => {
    const parsed = parseFragranticaHtml(SAUVAGE_FIXTURE_HTML);
    expect(parsed.name).toBe("Sauvage");
    expect(parsed.brand).toBe("Dior");
    expect(parsed.year).toBe(2015);
    expect(parsed.perfumers).toEqual(["François Demachy"]);
    expect(parsed.notes).toEqual({
      top: ["Calabrian bergamot", "Pepper"],
      middle: ["Sichuan Pepper", "Lavender", "Pink Pepper", "Vetiver", "Patchouli", "Geranium", "elemi"],
      base: ["Ambroxan", "Cedar", "Labdanum"],
    });
  });

  it("extracts perfumers from 'was created by' phrasing, and accords past a short first guess at the search window", () => {
    const parsed = parseFragranticaHtml(LIBRE_FIXTURE_HTML);
    expect(parsed.perfumers).toEqual(["Anne Flipo", "Carlos Benaïm"]);
    expect(parsed.accords).toEqual([
      { name: "white floral", strength: 100, color: null },
      { name: "citrus", strength: 83, color: null },
      { name: "lavender", strength: 51, color: null },
      { name: "floral", strength: 44, color: null },
      { name: "fresh", strength: 36, color: null },
      { name: "musky", strength: 33, color: null },
      { name: "vanilla", strength: 32, color: null },
      { name: "sweet", strength: 32, color: null },
    ]);
    expect(parsed.notes?.middle).toEqual(["Orange Blossom", "Jasmine Tea", "Jasmine"]);
  });

  it("returns an empty result rather than throwing on unrelated HTML", () => {
    const parsed = parseFragranticaHtml("<html><body>not a fragrantica page</body></html>");
    expect(parsed.name).toBeUndefined();
    expect(parsed.accords).toEqual([]);
    expect(parsed.notes).toEqual({ top: [], middle: [], base: [] });
  });
});

describe("parseFragranticaJson", () => {
  it("still parses a hand-authored JSON payload the same as before", () => {
    const parsed = parseFragranticaJson({
      name: "Test Fragrance",
      brand: "Test House",
      notes: { top: ["Bergamot"], middle: ["Rose"], base: ["Musk"] },
      accords: [{ name: "woody", strength: 80 }],
      ratingValue: 4.1,
      ratingCount: 50,
    });
    expect(parsed.name).toBe("Test Fragrance");
    expect(parsed.brand).toBe("Test House");
    expect(parsed.notes).toEqual({ top: ["Bergamot"], middle: ["Rose"], base: ["Musk"] });
    expect(parsed.accords).toEqual([{ name: "woody", strength: 80, color: null }]);
  });
});
