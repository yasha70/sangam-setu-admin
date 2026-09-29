"""Generate website/public/doodles.svg: a seamless chat-wallpaper style tile of wedding doodles.

Every icon is drawn as line art on a 48x48 grid. They are placed on a 6x6 grid with
some jitter, rotation and scale, and small filler shapes go in the gaps. The fixed
seed keeps the tile stable between runs.

    python3 scripts/make_doodles.py
"""
import math
import random
from pathlib import Path

TILE = 720
CELLS = 6
LINE = 2.1  # rendered stroke width in px, the same for every doodle
STROKE = "#1f2c33"
OUT = Path(__file__).resolve().parent.parent / "website" / "public" / "doodles.svg"


def arc_points(n, fn):
    return [fn(i / (n - 1)) for i in range(n)]


def garland():
    pts = arc_points(11, lambda t: (6 + 36 * t, 8 + 30 * (1 - (2 * t - 1) ** 2)))
    beads = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3"/>' for x, y in pts)
    return beads + '<path d="M24 42l-4 5h8z"/>'


def mangalsutra():
    left = arc_points(7, lambda t: (8 + 14 * t, 6 + 28 * t ** 1.4))
    right = arc_points(7, lambda t: (40 - 14 * t, 6 + 28 * t ** 1.4))
    beads = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="{STROKE}"/>' for x, y in left + right)
    return beads + '<circle cx="20" cy="40" r="3.5"/><circle cx="28" cy="40" r="3.5"/>'


def marigold():
    petals = "".join(
        f'<circle cx="{24 + 13 * math.cos(a):.1f}" cy="{24 + 13 * math.sin(a):.1f}" r="5.5"/>'
        for a in (i * 2 * math.pi / 9 for i in range(9))
    )
    return petals + '<circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="1.5"/>'


ICONS = {
    "rings": '<circle cx="18" cy="30" r="10"/><circle cx="30" cy="30" r="10"/><path d="M30 20l-4-5 4-5 4 5z"/>',
    "diya": '<path d="M6 28h36c-2 8-9 12-18 12S8 36 6 28z"/><path d="M24 24c-4-4-3-9 0-14 3 5 4 10 0 14z"/><path d="M19 45h10"/>',
    "kalash": '<path d="M14 22h20c5 4 7 9 5 14-2 6-8 8-15 8s-13-2-15-8c-2-5 0-10 5-14z"/><path d="M17 22v-4h14v4"/>'
              '<path d="M17 18c-4-2-7-2-10 0 3 2 6 2 10 0z"/><path d="M31 18c4-2 7-2 10 0-3 2-6 2-10 0z"/>'
              '<ellipse cx="24" cy="11" rx="6" ry="7"/><path d="M11 32h26"/>',
    "marigold": marigold(),
    "hand": '<path d="M13 44V22a3 3 0 0 1 6 0V14a3 3 0 0 1 6 0V12a3 3 0 0 1 6 0v4a3 3 0 0 1 6 0v14l5-5a3 3 0 0 1 4 4l-8 10-3 5z"/>'
            '<circle cx="25" cy="32" r="4"/><circle cx="25" cy="32" r="1"/><path d="M16 38h3M31 38h3"/>',
    "shehnai": '<path d="M9 41l19-19M12 44l19-19"/><path d="M28 21l7-12c4 1 7 4 8 8l-12 7"/><circle cx="8" cy="44" r="2.5"/>'
               '<circle cx="15" cy="37" r="1"/><circle cx="20" cy="32" r="1"/><circle cx="25" cy="27" r="1"/>',
    "dhol": '<ellipse cx="13" cy="24" rx="6" ry="12"/><ellipse cx="35" cy="24" rx="6" ry="12"/><path d="M13 12h22M13 36h22"/>'
            '<path d="M17 12l4 24 4-24 4 24 4-24"/><path d="M41 8l5-5"/>',
    "mandap": '<path d="M8 44V20M40 44V20M3 44h42M5 20h38"/><path d="M8 20c2-8 8-12 16-14 8 2 14 6 16 14"/><path d="M24 6V2"/>'
              '<path d="M8 25c5 5 11 5 16 0 5 5 11 5 16 0"/>',
    "lotus": '<path d="M24 36c-6-6-6-14 0-22 6 8 6 16 0 22z"/><path d="M24 36c-8 0-14-6-16-14 8 0 14 5 16 14z"/>'
             '<path d="M24 36c8 0 14-6 16-14-8 0-14 5-16 14z"/><path d="M10 41h28"/>',
    "heart": '<path d="M24 40S8 30 8 19a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 21-16 21z"/>',
    "card": '<rect x="6" y="12" width="36" height="26" rx="2"/><path d="M6 14l18 13 18-13"/><circle cx="24" cy="28" r="4"/>',
    "gift": '<rect x="8" y="20" width="32" height="22" rx="2"/><path d="M6 14h36v6H6zM24 14v28"/>'
            '<path d="M24 14c-4-8-12-8-10-2 1 2 6 2 10 2zM24 14c4-8 12-8 10-2-1 2-6 2-10 2z"/>',
    "phone": '<g transform="scale(2)"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/></g>',
    "garland": garland(),
    "bangles": '<ellipse cx="24" cy="16" rx="15" ry="5"/><ellipse cx="24" cy="24" rx="15" ry="5"/><ellipse cx="24" cy="32" rx="15" ry="5"/>',
    "doli": '<rect x="12" y="18" width="24" height="18" rx="2"/><path d="M10 18c4-8 24-8 28 0"/><path d="M24 10V6"/><path d="M2 28h8M38 28h8"/>'
            '<path d="M18 36V24c3 3 9 3 12 0v12"/>',
    "pagdi": '<path d="M8 32c0-12 7-20 16-20s16 8 16 20z"/><path d="M10 25c8-4 20-4 28 0"/><path d="M8 32h32v4H8z"/>'
             '<path d="M30 13c4-6 10-6 12-2-4 0-8 2-10 6"/><circle cx="24" cy="18" r="2"/>',
    "laddoo": '<circle cx="16" cy="33" r="7"/><circle cx="32" cy="33" r="7"/><circle cx="24" cy="21" r="7"/><path d="M3 42h42"/>'
              '<circle cx="14" cy="31" r=".8"/><circle cx="30" cy="35" r=".8"/><circle cx="26" cy="19" r=".8"/>',
    "forward": '<path d="M8 36v-5a11 11 0 0 1 11-11h13"/><path d="M26 13l7 7-7 7"/><path d="M35 13l7 7-7 7"/>',
    "shield": '<g transform="scale(2)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></g>',
    "lock": '<g transform="scale(2)"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>',
    "bubble": '<path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20l-8 8v-8H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z"/>'
              '<path d="M24 29s-6-3.5-6-7.5a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z"/>',
    "moon": '<path d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z"/><path d="M40 6v6M37 9h6"/>',
    "camera": '<g transform="scale(2)"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></g>',
    "nath": '<circle cx="21" cy="25" r="12"/><circle cx="21" cy="38" r="3"/><path d="M31 18c5-3 9-8 10-14"/><circle cx="41" cy="4" r="2"/>',
    "mangalsutra": mangalsutra(),
    "muhurat": '<rect x="6" y="10" width="36" height="32" rx="3"/><path d="M6 19h36M15 6v8M33 6v8"/>'
               '<path d="M24 37s-6-3.5-6-7.5a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z"/>',
    "chai": '<path d="M8 20h26v8a12 12 0 0 1-12 12h-2A12 12 0 0 1 8 28z"/><path d="M34 23h3a5 5 0 0 1 0 10h-4"/>'
            '<path d="M16 15c-2-3 2-4 0-7M22 15c-2-3 2-4 0-7M28 15c-2-3 2-4 0-7"/><path d="M5 44h32"/>',
    "sparkle": '<path d="M24 6c1 10 8 17 18 18-10 1-17 8-18 18-1-10-8-17-18-18 10-1 17-8 18-18z"/>',
}

FILLERS = [
    '<circle cx="0" cy="0" r="4"/>',
    '<circle cx="0" cy="0" r="6"/>',
    '<circle cx="0" cy="0" r="1.6" fill="{s}"/>',
    '<path d="M-4 0h8M0-4v8"/>',
    '<path d="M-4-4l8 8M4-4l-8 8"/>',
    '<path d="M0-5l5 9h-10z"/>',
    '<path d="M-8 0c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
    '<path d="M0 5s-5-3-5-6a2.5 2.5 0 0 1 5-1 2.5 2.5 0 0 1 5 1c0 3-5 6-5 6z"/>',
]


def main():
    rnd = random.Random(17)
    names = list(ICONS)
    rnd.shuffle(names)
    cell = TILE / CELLS
    parts = []

    def place(markup, x, y, rot, scale, size=48):
        for dx in (-TILE, 0, TILE):
            for dy in (-TILE, 0, TILE):
                cx, cy = x + dx, y + dy
                reach = max(size, 16) * scale
                if -reach < cx < TILE + reach and -reach < cy < TILE + reach:
                    parts.append(
                        f'<g transform="translate({cx:.1f} {cy:.1f}) rotate({rot:.1f}) scale({scale:.2f}) '
                        f'translate({-size / 2} {-size / 2})" stroke-width="{LINE / scale:.2f}">{markup}</g>'
                    )

    k = 0
    for row in range(CELLS):
        for col in range(CELLS):
            name = names[k % len(names)]
            k += 1
            x = col * cell + cell / 2 + rnd.uniform(-10, 10)
            y = row * cell + cell / 2 + rnd.uniform(-10, 10)
            place(ICONS[name], x, y, rnd.uniform(-28, 28), rnd.uniform(1.55, 1.85))

    for row in range(CELLS):
        for col in range(CELLS):
            for fx, fy in ((col * cell, row * cell), (col * cell + cell / 2, row * cell), (col * cell, row * cell + cell / 2)):
                if rnd.random() < 0.6:
                    f = rnd.choice(FILLERS).format(s=STROKE)
                    place(f, fx + rnd.uniform(-6, 6), fy + rnd.uniform(-6, 6), rnd.uniform(0, 90), rnd.uniform(1.3, 1.9), size=0)

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{TILE}" height="{TILE}" viewBox="0 0 {TILE} {TILE}">'
        f'<g fill="none" stroke="{STROKE}" stroke-linecap="round" stroke-linejoin="round">'
        + "".join(parts)
        + "</g></svg>\n"
    )
    OUT.write_text(svg)
    print(f"wrote {OUT} ({len(svg) // 1024} KB, {len(parts)} shapes)")


if __name__ == "__main__":
    main()
