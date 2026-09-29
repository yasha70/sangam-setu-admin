"""Generate illustrated portraits for the sample profiles: website/public/samples/{bride,groom}-NN.svg.

These are drawings, not photos of real people, so sample profiles are never mistaken
for real families.

    python3 scripts/make_sample_avatars.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "website" / "public" / "samples"
SKIN = ["#f3cfae", "#e6b48c", "#d29a6f", "#b97e55", "#9c6440", "#e9bf98"]
HAIR = ["#1d1210", "#2a1a14", "#1a1a1a", "#3a2418"]
BG = [
    ("#ffe3ec", "#ffc4d6"), ("#fff0cc", "#ffd27a"), ("#e3f4e4", "#b9e0bb"), ("#dff3f4", "#a9dde0"),
    ("#f5e6f3", "#e3bddd"), ("#ffe8d6", "#ffc59a"),
]
BRIDE = [("#c2185b", "#ffd24d"), ("#b71c1c", "#ffcc33"), ("#8e24aa", "#ffd966"), ("#ef6c00", "#8e0038"),
         ("#00897b", "#ffcc33"), ("#d81b60", "#6a1b9a")]
GROOM = [("#f4e1b8", "#b8860b"), ("#283593", "#ffcc33"), ("#6d4c41", "#ffcc33"), ("#00695c", "#ffd966"),
         ("#ad1457", "#ffcc33"), ("#fff3e0", "#c62828")]
SAFA = ["#e65100", "#c62828", "#f9a825", "#ad1457"]


def frame(bg):
    a, b = bg
    dots = "".join(
        f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity=".45"/>'
        for x, y, r in [(46, 60, 6), (360, 90, 5), (330, 40, 3), (70, 150, 3), (350, 190, 4), (30, 250, 4)]
    )
    flowers = "".join(
        f'<g transform="translate({x} {y})"><circle r="11" fill="#f9a825"/><circle r="7" fill="#f57c00"/><circle r="3" fill="#b34700"/></g>'
        for x, y in [(34, 26), (72, 18), (110, 24), (290, 24), (328, 18), (366, 26)]
    )
    return (
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/>'
        f'<stop offset="1" stop-color="{b}"/></linearGradient></defs>'
        f'<rect width="400" height="500" fill="url(#bg)"/>{dots}'
        f'<path d="M0 6 Q200 44 400 6" stroke="#2e7d32" stroke-width="3" fill="none"/>{flowers}'
    )


def face(skin, cx=200, cy=236):
    return (
        f'<rect x="{cx-26}" y="{cy+58}" width="52" height="56" rx="18" fill="{skin}"/>'
        f'<ellipse cx="{cx-62}" cy="{cy+6}" rx="11" ry="16" fill="{skin}"/>'
        f'<ellipse cx="{cx+62}" cy="{cy+6}" rx="11" ry="16" fill="{skin}"/>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="62" ry="76" fill="{skin}"/>'
        f'<path d="M{cx-38} {cy-14} q14 -9 26 0 M{cx+12} {cy-14} q14 -9 26 0" stroke="#3a2418" stroke-width="4" fill="none" stroke-linecap="round"/>'
        f'<ellipse cx="{cx-24}" cy="{cy+2}" rx="6" ry="7" fill="#2a1a14"/><ellipse cx="{cx+24}" cy="{cy+2}" rx="6" ry="7" fill="#2a1a14"/>'
        f'<circle cx="{cx-22}" cy="{cy}" r="2" fill="#fff"/><circle cx="{cx+26}" cy="{cy}" r="2" fill="#fff"/>'
        f'<path d="M{cx} {cy+8} q-6 16 2 20" stroke="#00000033" stroke-width="3" fill="none" stroke-linecap="round"/>'
        f'<path d="M{cx-18} {cy+42} q18 16 36 0" stroke="#8c2f39" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
        f'<ellipse cx="{cx-40}" cy="{cy+30}" rx="11" ry="7" fill="#ff7a8a" opacity=".28"/>'
        f'<ellipse cx="{cx+40}" cy="{cy+30}" rx="11" ry="7" fill="#ff7a8a" opacity=".28"/>'
    )


def bride(i):
    skin = SKIN[i % len(SKIN)]
    hair = HAIR[i % len(HAIR)]
    main, accent = BRIDE[i % len(BRIDE)]
    body = (
        f'<path d="M30 500 C 44 392 120 350 200 350 C 280 350 356 392 370 500 Z" fill="{main}"/>'
        # dupatta drape with a gold border
        f'<path d="M120 368 C 170 420 250 470 300 500 L 250 500 C 210 470 150 420 104 382 Z" fill="{accent}" opacity=".9"/>'
        f'<path d="M104 382 C 150 420 210 470 250 500" stroke="#ffe082" stroke-width="5" fill="none" stroke-dasharray="2 7" stroke-linecap="round"/>'
        # necklace
        f'<path d="M160 350 Q200 400 240 350" stroke="#f2b632" stroke-width="7" fill="none"/>'
        f'<circle cx="200" cy="384" r="9" fill="#d50000" stroke="#f2b632" stroke-width="4"/>'
    )
    back_hair = f'<path d="M130 220 C 120 330 150 380 200 380 C 250 380 280 330 270 220 Z" fill="{hair}"/>'
    top_hair = (
        f'<path d="M136 236 C 132 170 166 148 200 148 C 234 148 268 170 264 236 C 250 196 226 184 200 186 C 174 184 150 196 136 236 Z" fill="{hair}"/>'
        f'<path d="M200 150 L200 186" stroke="#c62828" stroke-width="3"/>'  # sindoor-style parting line
    )
    jewels = (
        f'<path d="M200 150 L200 170" stroke="#f2b632" stroke-width="3"/><circle cx="200" cy="176" r="7" fill="#f2b632"/>'
        f'<circle cx="200" cy="176" r="3" fill="#d50000"/>'  # maang tikka
        f'<circle cx="200" cy="208" r="4.5" fill="#c62828"/>'  # bindi
        f'<circle cx="138" cy="262" r="7" fill="#f2b632"/><circle cx="262" cy="262" r="7" fill="#f2b632"/>'
    )
    return frame(BG[i % len(BG)]) + back_hair + body + face(skin) + top_hair + jewels


def groom(i):
    skin = SKIN[(i + 2) % len(SKIN)]
    hair = HAIR[i % len(HAIR)]
    main, accent = GROOM[i % len(GROOM)]
    body = (
        f'<path d="M30 500 C 44 392 120 350 200 350 C 280 350 356 392 370 500 Z" fill="{main}"/>'
        f'<path d="M176 352 L200 372 L224 352 L224 364 L200 384 L176 364 Z" fill="{accent}"/>'  # collar
        f'<path d="M200 384 L200 500" stroke="{accent}" stroke-width="4"/>'
        + "".join(f'<circle cx="200" cy="{y}" r="5" fill="{accent}"/>' for y in (404, 432, 460, 488))
        + f'<path d="M92 420 C 110 400 140 392 160 392" stroke="{accent}" stroke-width="3" fill="none" opacity=".7"/>'
        f'<path d="M308 420 C 290 400 260 392 240 392" stroke="{accent}" stroke-width="3" fill="none" opacity=".7"/>'
    )
    if i % 3 == 0:  # safa (wedding turban) with a plume
        safa = SAFA[i % len(SAFA)]
        top = (
            f'<path d="M132 214 C 128 150 168 128 200 128 C 232 128 272 150 268 214 C 250 196 226 190 200 190 C 174 190 150 196 132 214 Z" fill="{safa}"/>'
            f'<path d="M138 196 C 170 168 230 168 262 196" stroke="#ffd54f" stroke-width="5" fill="none"/>'
            f'<path d="M142 178 C 176 150 226 150 258 178" stroke="#00000022" stroke-width="5" fill="none"/>'
            f'<circle cx="200" cy="160" r="9" fill="#ffd54f" stroke="#c62828" stroke-width="3"/>'
            f'<path d="M206 154 C 214 128 236 116 246 118 C 236 128 224 140 212 158 Z" fill="#fff8e1" stroke="#ffd54f" stroke-width="2"/>'
        )
    else:
        top = f'<path d="M138 222 C 130 164 168 148 200 148 C 236 148 272 166 262 222 C 250 196 232 186 212 184 C 190 190 160 196 138 222 Z" fill="{hair}"/>'
    moustache = f'<path d="M180 266 q20 -10 40 0 q-20 6 -40 0 Z" fill="{hair}"/>' if i % 2 else ""
    return frame(BG[(i + 3) % len(BG)]) + body + face(skin) + top + moustache


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i in range(12):
        for kind, fn in (("bride", bride), ("groom", groom)):
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">{fn(i)}</svg>\n'
            (OUT / f"{kind}-{i + 1:02d}.svg").write_text(svg)
    print("wrote", len(list(OUT.glob("*.svg"))), "portraits to", OUT)


if __name__ == "__main__":
    main()
