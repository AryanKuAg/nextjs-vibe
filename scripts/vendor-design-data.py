import csv, json, re, pathlib
S = pathlib.Path("/private/tmp/claude-501/-Users-alemantrix-Desktop-nextjs-vibe/42ba0414-1a5b-45d3-ac33-f676f26d5fc9/scratchpad")
def rows(name):
    with open(S/f"uupm-{name}.csv", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def kw(s): return [w.strip().lower() for w in re.split(r"[,|]", s or "") if w.strip()]

products, palettes = [], {}
for r in rows("products"):
    products.append({
        "id": int(r["No"]),
        "type": r["Product Type"],
        "keywords": kw(r["Keywords"]),
        "style": r["Primary Style Recommendation"],
        "alternateStyles": r["Secondary Styles"],
        "landingPattern": r["Landing Page Pattern"],
        "paletteFocus": r["Color Palette Focus"],
        "notes": r["Key Considerations"],
    })

for r in rows("colors"):
    palettes[str(int(r["No"]))] = {
        "primary": r["Primary"], "onPrimary": r["On Primary"],
        "secondary": r["Secondary"], "onSecondary": r["On Secondary"],
        "accent": r["Accent"], "onAccent": r["On Accent"],
        "background": r["Background"], "foreground": r["Foreground"],
        "card": r["Card"], "cardForeground": r["Card Foreground"],
        "muted": r["Muted"], "mutedForeground": r["Muted Foreground"],
        "border": r["Border"], "ring": r["Ring"],
        "destructive": r["Destructive"], "onDestructive": r["On Destructive"],
    }

styles = [{
    "name": r["Style Category"],
    "keywords": kw(r["Keywords"]),
    "effects": r["Effects & Animation"],
    "promptKeywords": r["AI Prompt Keywords"][:400],
    "bestFor": r["Best For"],
    "avoid": r["Do Not Use For"],
} for r in rows("styles")]

typography = [{
    "name": r["Font Pairing Name"],
    "heading": r["Heading Font"],
    "body": r["Body Font"],
    "mood": kw(r["Mood/Style Keywords"]),
    "bestFor": r["Best For"],
    "cssImport": r["CSS Import"],
} for r in rows("typography")]

out = {
    "_source": "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT)",
    "_note": "Trimmed to the fields the Build Brief uses. Regenerate with scripts/vendor-design-data.py.",
    "products": products, "palettes": palettes, "styles": styles, "typography": typography,
}
p = pathlib.Path("/Users/alemantrix/Desktop/nextjs-vibe/src/lib/design-data/uupm.json")
p.write_text(json.dumps(out, separators=(",", ":")))
print(f"products={len(products)} palettes={len(palettes)} styles={len(styles)} typography={len(typography)}")
print(f"written {p.stat().st_size/1024:.0f} KB")
