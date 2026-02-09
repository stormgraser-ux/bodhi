# Bodhi Design System — "Temple Garden"

> Every visual choice should trace to a real Buddhist concept.
> Every interaction should embody mindfulness, not just reference it.
> This app is a gift for someone who practices. Depth matters.

---

## Design Philosophy

### The Core Feeling

Imagine sitting at a low puja table in a quiet room. Warm wood under your hands. Incense smoke curling. A candle flame. The world outside doesn't exist for a moment. You're not productive. You're not optimizing. You're just... present.

That's what opening Bodhi should feel like.

### Guiding Principles

**Ma (間) — Meaningful Emptiness**
Whitespace is not wasted space. It IS the design. Every gap, every margin, every pause exists with intention. A blank note is not empty — it is *sunyata*: "the openness that allows anything to occur."

**Wabi-Sabi (侘寂) — The Beauty of Imperfection**
The app should feel handcrafted, not machine-generated. Subtle texture variations. Organic edges. Paper grain. Brush strokes that aren't digitally smooth. Nothing pixel-perfect — everything human.

**Kanso (簡素) — Simplicity**
Remove all non-essential elements. If it doesn't serve the writer's presence, it doesn't belong. No metrics, no streaks, no productivity theater.

**Seijaku (静寂) — Stillness**
The app is quiet. Transitions are slow and deliberate, like walking meditation (*kinhin*). Animations breathe at the pace of natural breath (4–6 seconds per cycle). Nothing snaps, nothing rushes.

### The Two Arrows (Sallatha Sutta)

A teaching that is personally meaningful to the recipient:

> "When touched with a feeling of pain, the uninstructed person sorrows, grieves, and laments... It is as if a man were pierced by an arrow and, following the first piercing, he was pierced by a second arrow. He would feel the pain of two arrows."

The first arrow is the painful event. The second arrow is the suffering we create by clinging to it — replaying mistakes, rehearsing regret, punishing ourselves for the past. The Buddha teaches that while we cannot always avoid the first arrow, we can choose not to fire the second.

**How this shapes the app:**
- **No guilt.** No "you haven't written in 5 days." No streaks. No badges. The app waits patiently, like a cushion on the floor. It's there when you're ready.
- **No judgment of past work.** Edit history is available but never prominent. Old versions aren't shown as "mistakes" — they're layers, like rings in a tree. The kintsugi principle: changes are golden seams, not corrections.
- **Deletion is gentle.** Notes aren't "trashed." They're released — *letting go* is the act, not discarding. The archive is a place of rest, not a graveyard.
- **The writing space is a refuge.** Like sitting at a puja table, opening a note should feel like entering a protected space. The editor is where you practice Right Thought (*Samma Sankappa*) — examining your mind with clarity and compassion, including compassion for yourself.
- **Karuna (करुणा) — Compassion.** The app embodies *karuna*, including self-compassion. Empty states are warm invitations, not cold voids. Error messages are gentle. Nothing in the UI makes the user feel they've done something wrong.

### Sati (सति) — Remembering

The app's deepest connection to Buddhism: *sati* (mindfulness) literally means "to remember" in Pali. Bodhi is an instrument of *sati* — it helps you remember your thoughts, return to them, and sit with them. Writing in Bodhi is not productivity. It is practice.

---

## Color Palette

Every color traces to a specific Buddhist art tradition.

### Light Theme: "Temple Garden"

| Token | Hex | Name | Origin |
|-------|-----|------|--------|
| `--bg` | `#f4e8d1` | Aged paper | *Kitsune-iro* — washi paper naturally aged |
| `--surface` | `#f0ebe3` | Chalky white | *Gofun-iro* — crushed shell pigment |
| `--text` | `#1a1a1a` | Ink black | *Sumi-iro* — sumi ink, never pure #000 |
| `--text-secondary` | `#6b6b6b` | Stone gray | *Nezumi-iro* — weathered temple stone |
| `--accent` | `#5c1a2a` | Deep maroon | Monastic robe color — dignity, the sangha |
| `--accent-gold` | `#c4a24e` | Gold leaf | Thangka painting — enlightenment |
| `--accent-green` | `#4a6741` | Moss green | *Koke-iro* — moss on temple grounds |
| `--border` | `#d4c8b8` | Ash | Warm, like incense ash on wood |
| `--selected` | `#ede4d4` | Warm sand | Raked karesansui gravel |
| `--danger` | `#8a3a3a` | Muted rust | Subdued — not alarming, just clear |

### Dark Theme: "Dark Temple" (Phase 4)

| Token | Hex | Name | Origin |
|-------|-----|------|--------|
| `--bg` | `#1a1a18` | Deep ink | Sumi ink on the darkest wash |
| `--surface` | `#2a2520` | Charcoal | Burned wood, temple timber |
| `--text` | `#e8dcc8` | Warm parchment | Aged scroll, never pure white |
| `--text-secondary` | `#8a8078` | Aged stone | Worn path stones |
| `--accent` | `#c4a24e` | Soft gold | Gold becomes primary in darkness |
| `--accent-green` | `#6a8a62` | Sage | Muted temple garden |
| `--border` | `#4a4540` | Dark stone | Temple wall in shadow |

---

## Typography

**Constraint:** No external font requests. System fonts only (privacy).

### Font Stack

```css
/* Body — warm, humanist sans-serif */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;

/* Editor title — slightly more literary feel */
/* Uses the same stack but at larger size with lighter weight, */
/* which brings out the humanist qualities of these system fonts */
```

### Scale

| Element | Size | Weight | Spacing |
|---------|------|--------|---------|
| App title "Bodhi" | 22px | 300 (light) | 2px letter-spacing |
| Note title (editor) | 26px | 400 (normal) | 0.5px |
| Body text | 15px | 400 | Normal |
| Secondary text | 13px | 400 | Normal |
| Tags, metadata | 12px | 500 | 0.5px uppercase |

The app title should feel unhurried. Light weight, generous spacing — like a temple inscription.

---

## Texture & Surface

### Paper Grain

The editor background should have a very subtle paper grain texture — visible on close inspection but not distracting. This references the *washi* paper used in Buddhist calligraphy (*shakyo* — sutra copying).

Implementation: CSS background with a subtle noise pattern at very low opacity (2-4%). Can be done with a tiny inline SVG or CSS gradient pattern — no external image request needed.

### Ink-Wash Accents

Subtle sumi-e inspired gradients at section boundaries. A very soft gradient from transparent to a faint warm gray, like the edge of an ink wash where brush meets paper.

### Warm Wood Tone

The sidebar / note list should evoke the warm tone of a meditation table. Not literal wood grain, but a warm undertone to the surface color that feels like sitting at a puja table.

---

## Iconography & Motifs

### Enso (円相) — App Icon & Loading

An **open** enso (incomplete circle) drawn with a single brush stroke. Open because:
- Philosophically authentic: embraces imperfection (*wabi-sabi*)
- Represents ongoing journey, not arrival
- "Opens out to infinity" — the circle is not separate from all that is

The loading animation: the enso drawn stroke by stroke, at the pace of a single breath. Each load, slightly different (randomized brush parameters). The stroke should look hand-drawn — varying thickness, ink pooling at the start, trailing off at the open end.

### Bodhi Leaf (Heart-Shaped)

The *Ficus religiosa* has distinctively heart-shaped leaves. Used as:
- Note icon in the list view (subtle, small)
- Empty state decoration
- Falling leaf animation for archive/delete (the leaf returns to the earth)

### Lotus (पद्म) — Stages of Bloom

| State | Lotus Stage | Meaning |
|-------|-------------|---------|
| New note | Closed bud | Potential, the journey begins |
| Note with content | Partially open | The path, truth still unfolding |
| (Future: synced) | Fully bloomed | Completion, connection |

Used sparingly — the sync indicator, empty states. Not plastered everywhere.

---

## Layout Principles

### Ma in Practice

- **Editor margins:** Generous. The text should feel like it's floating in space, not crammed edge-to-edge. Think of a poem on a large sheet of paper.
- **List item spacing:** Each note in the list breathes. Padding inside items, space between items.
- **Section gaps:** Clear separation between sidebar sections (search, tags, notes) with visible space, not just borders.
- **The editor is a refuge:** When you open a note, the writing area should feel expansive and protected. The sidebar is the world; the editor is the temple.

### Asymmetry (Fukinsei)

Perfect symmetry feels artificial. The layout can have subtle asymmetry:
- Sidebar slightly narrower than a "balanced" split
- Text alignment that favors the left (natural reading position)
- Decorative elements placed off-center

---

## Interaction Design

### Pacing (Kinhin)

All transitions at the pace of walking meditation:
- View transitions: 300-400ms ease-out (not instant, not sluggish)
- Fade-ins: 200ms (content appearing like dawn)
- Hover states: 150ms (subtle, responsive but not twitchy)
- Loading enso: 4-6 seconds for one rotation (one breath cycle)

### Sound (Optional, Future)

If implemented:
- **Save:** A single singing bowl strike, very quiet. The tone arises, sustains, fades — teaching *anicca* (impermanence) through sound.
- **Transitions:** Brief temple bell tone, barely audible. A call to return to the present.
- **Everything else:** Silence. The app is fundamentally quiet.

### The Puja Table Feeling

The editor area should evoke sitting at a low altar table:
- Warm surface tone underneath the paper texture
- The writing area feels grounded, connected to the earth
- Content is centered and calm, like objects carefully placed on an altar
- Nothing flashes, blinks, or demands attention

---

## Component-Specific Design

### Sidebar (The Garden Path)

The sidebar is the path through the garden — how you navigate to your notes. It should feel like walking through a temple garden: calm, orderly, with moments of beauty.

- Warm surface color with very subtle wood undertone
- Section headers in small uppercase with generous letter-spacing (like carved stone inscriptions)
- Note list items: clean, with Bodhi leaf icon, warm hover state
- The "new note" button: understated, accent-colored, placed naturally

### Editor (The Writing Table)

The editor is where practice happens. It is the puja table of the app.

- Background: Aged paper texture with subtle grain
- Title: Large, light weight, generous spacing — like writing the first line in a new journal
- Body: Clean, readable, comfortable line height (1.7+)
- Toolbar: Minimal on desktop, hidden on mobile. The writing itself is the practice, not the formatting tools.
- Markdown preview: "live" on desktop (side-by-side), "edit" on mobile

### Tags (Indra's Net)

Tags embody *Pratityasamutpada* (dependent origination) and Indra's Net — every note connected to every other through a web of shared meaning.

- Tag chips: Rounded, organic-feeling, muted colors
- Active tag: Gold highlight (a jewel in Indra's Net catching the light)
- Tag appearance: Lowercase, unhurried, not shouting

### Empty States (Sunyata)

Empty states are not voids — they are *sunyata*: spacious, inviting, full of potential.

- New app (no notes): A gentle invitation to begin. Perhaps a partially open lotus bud. Text: warm, welcoming, not instructional.
- No search results: "Nothing found" feels wrong. Something like "The garden is quiet here" — acknowledging the emptiness without judgment.
- New note: The blank page is an invitation, not a challenge. Warm paper, generous space, a gentle placeholder.

### Delete / Archive (Letting Go)

Deletion is an act of *letting go* — not discarding, but releasing attachment.

- Confirm dialog: Gentle language. Not "Are you sure?" (which implies you're making a mistake) but something that acknowledges the release.
- Archived notes: Treated with kintsugi respect — golden treatment, not trash can stigma.
- The animation: A leaf gently falling, returning to the earth. Natural, not dramatic.

---

## What We Do NOT Do

### Avoid Orientalism
- No random kanji or Sanskrit used as decoration
- No bamboo, bonsai, cherry blossoms, torii gates (not Buddhist)
- No yin-yang (Taoist, not Buddhist)
- No "oriental" fonts that make Latin script "look Asian"
- No Buddha statues/faces used as decorative elements
- No Om symbols used casually

### Avoid Productivity Culture
- No word counts
- No "writing streaks"
- No "you haven't written in X days" guilt trips
- No gamification of any kind
- No sharing, no social features
- No "mindfulness scores"

### Avoid the Second Arrow
- No error messages that feel like blame
- No prominent display of edit history (don't dwell on changes)
- No visual distinction between "good" notes and "bad" notes
- Nothing that makes the user feel they should be writing more, better, or differently
- The app is a cushion, not a coach

---

## Implementation Priority

Phase 2 focuses on the light theme ("Temple Garden") only.

1. **Color palette swap** — Replace functional colors with Buddhist palette
2. **Typography** — Adjust weights, sizes, spacing per the scale above
3. **Texture** — Paper grain background, warm surface tones
4. **Spacing** — Apply Ma principle: increase margins, padding, breathing room
5. **Sidebar refinement** — Warm wood tone, section typography, Bodhi leaf icons
6. **Editor refinement** — Aged paper texture, title styling, generous margins
7. **Tags** — Gold active state, organic chip styling
8. **Empty states** — Warm, inviting text and subtle lotus/leaf motifs
9. **Transitions** — Slow, deliberate animations per kinhin pacing
10. **Enso loading** — SVG animation, hand-drawn feel

Dark theme deferred to Phase 4.
