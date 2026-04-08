const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const envContent = fs.readFileSync("/Users/jiwonhwang/Documents/indiehacker/Jiwon-studio/.env.local", "utf-8");
const API_KEY = envContent.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();

const STYLE = `
CRITICAL RULES:
- TRANSPARENT BACKGROUND - absolutely NO colored background
- Lofi kawaii illustration style - hand-drawn, warm, cozy
- Soft pastel colors, warm tones (cream, butter yellow, honey gold, soft pink)
- Think Studio Ghibli bakery meets lofi girl aesthetic
- Slightly textured like watercolor or colored pencil
- NO text, NO labels, NO watermarks
- Each item SINGLE, centered, high detail
- Top-down perspective for map items, side view for characters/buildings
`;

const ASSETS = [
  // Map terrain pieces (top-down)
  { name: "croissant-mountain", prompt: "A single large croissant shaped like a mountain peak, golden flaky layers forming rocky ridges, butter melting like snow on top, lofi kawaii illustration, top-down 3/4 view, warm pastel colors, hand-drawn style" },
  { name: "honey-lake", prompt: "A small golden honey lake seen from above, thick viscous honey with gentle ripples, honey dipper sticking out of one side, warm amber glow, lofi kawaii illustration, top-down view" },
  { name: "milk-sea", prompt: "A section of creamy white milk ocean with gentle waves and foam, splashes of cream, a tiny butter boat floating, soft white and cream tones, lofi kawaii illustration, top-down view" },
  { name: "wheat-field", prompt: "A patch of cute golden wheat field seen from above, swaying wheat stalks in warm golden tones, a few poppies mixed in, pastoral lofi illustration, warm and cozy" },
  { name: "baguette-bridge", prompt: "A long French baguette being used as a bridge, golden crusty exterior with score marks, spanning across a gap, lofi kawaii illustration, side view, warm tones" },
  { name: "jam-river", prompt: "A winding river of bright strawberry jam flowing through land, thick glossy red-pink jam with tiny strawberry chunks, seen from above, lofi kawaii illustration, warm colors" },

  // Buildings
  { name: "french-bakery", prompt: "A tiny cute French patisserie building, striped awning in pastel pink, baguettes visible through window, chimney puffing flour smoke, lofi kawaii illustration, warm pastel, hand-drawn, cozy" },
  { name: "japan-bakery", prompt: "A cute tiny Japanese bakery (パン屋) building, melon pan and anpan displayed, wooden traditional facade with modern twist, warm lighting, lofi kawaii illustration, cozy" },
  { name: "italian-bakery", prompt: "A cute tiny Italian forno/bakery, stone oven visible through open door, focaccia and ciabatta stacked outside, terracotta roof, olive vines, lofi kawaii illustration, warm Mediterranean colors" },
  { name: "korean-bakery", prompt: "A cute tiny Korean bakery (빵집) like Paris Baguette or Tous Les Jours, modern glass front, soboro bread and cream bread displayed, neon sign (no text), lofi kawaii illustration, warm pastel" },
  { name: "windmill", prompt: "A cute flour windmill with spinning wooden blades, stone base, flour sacks stacked outside, wheat growing around it, lofi kawaii pastoral illustration, warm golden tones" },
  { name: "oven-tower", prompt: "A tall brick oven tower with multiple baking chambers, steam and warm glow from each level, bread loaves visible inside, chimney puffing, lofi kawaii illustration, warm orange-red tones" },

  // Bread projectiles
  { name: "baguette-projectile", prompt: "A single French baguette flying through air with speed lines, golden crispy crust, slightly curved, dynamic angle as if thrown, lofi kawaii illustration, warm golden" },
  { name: "croissant-projectile", prompt: "A single buttery croissant spinning through air, golden flaky layers, butter glistening, dynamic spinning motion, lofi kawaii illustration, warm pastel" },
  { name: "melon-pan-projectile", prompt: "A single Japanese melon pan (melon bread) with grid pattern on top, round and cute, flying through air, golden-green top crust, lofi kawaii illustration" },
  { name: "pretzel-projectile", prompt: "A single twisted pretzel with salt crystals, golden brown, spinning through air dynamically, lofi kawaii illustration, warm brown tones" },

  // Characters/creatures
  { name: "bread-cat", prompt: "A tiny cute cat wearing a bread loaf costume (shokupan cat / 식빵 고양이), round eyes, tiny paws sticking out, warm cream colors, lofi kawaii illustration, adorable" },
  { name: "flour-spirit", prompt: "A tiny cute flour dust spirit, white fluffy round body like a small cloud, two dot eyes, floating with flour particles around it, magical, lofi kawaii illustration, soft white" },
  { name: "butter-slime", prompt: "A cute tiny butter slime creature, glossy yellow semi-transparent body, happy face, melting slightly, sitting in a butter dish, lofi kawaii illustration, warm yellow" },

  // Decorations
  { name: "flour-cloud", prompt: "A soft white flour dust cloud, puffy and round like a cumulus cloud but made of flour, sparkling flour particles, lofi kawaii illustration, soft white cream" },
  { name: "steam-puff", prompt: "A warm steam puff rising from fresh bread, cute curly shape, slightly golden-tinted warm steam, lofi kawaii illustration, warm white-cream" },
  { name: "cherry-blossom-tree", prompt: "A cute small cherry blossom tree with pink petals falling, warm spring feeling, placed in bakery garden, lofi kawaii pastoral illustration, soft pink and green" },
  { name: "bread-basket", prompt: "A woven basket overflowing with assorted cute breads (baguette, roll, croissant, soboro), rustic woven texture, lofi kawaii illustration, warm golden tones" },

  // Background/atmosphere
  { name: "planet-base", prompt: "A circular planet seen from space, entirely made of bread and bakery items, golden-brown surface with darker crust edges, continents shaped like bread types, warm glow atmosphere, lofi kawaii space illustration, cozy" },
];

const outputDir = "/Users/jiwonhwang/Documents/indiehacker/bread-planet/public/assets";

async function generate(item) {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: `${STYLE}\n\nCREATE:\n${item.prompt}` }] }],
      config: { responseModalities: ["Text", "Image"], imageGenerationConfig: { aspectRatio: "1:1", outputMimeType: "image/png" } },
    });
    const candidates = response.candidates || response.response?.candidates;
    if (candidates?.[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const data = Buffer.from(part.inlineData.data, "base64");
          const out = path.join(outputDir, `${item.name}.png`);
          fs.writeFileSync(out, data);
          try {
            const tmp = out + ".tmp";
            fs.renameSync(out, tmp);
            execSync(`python3 -c "
from rembg import remove
from PIL import Image
img = Image.open('${tmp}')
out = remove(img)
out.save('${out}')
"`, { timeout: 60000 });
            if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          } catch(e) {
            const tmp = out + ".tmp";
            if (fs.existsSync(tmp)) { if (!fs.existsSync(out)) fs.renameSync(tmp, out); else fs.unlinkSync(tmp); }
          }
          return true;
        }
      }
    }
    return false;
  } catch(e) { console.error(`  FAIL ${item.name}: ${e.message?.substring(0,80)}`); return false; }
}

async function main() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Generating ${ASSETS.length} bread planet assets...`);
  let ok=0, fail=0;
  for (let i = 0; i < ASSETS.length; i++) {
    process.stdout.write(`[${String(i+1).padStart(2)}/${ASSETS.length}] ${ASSETS[i].name}...`);
    if (await generate(ASSETS[i])) { ok++; console.log(" OK"); } else { fail++; console.log(" FAIL"); }
  }
  console.log(`\nDone: ${ok} ok / ${fail} fail`);
}
main();
