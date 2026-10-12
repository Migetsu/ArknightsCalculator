# Rich Text Parsing & Formatting Specification

## 1. Overview

In Arknights game data (`skill_table`, `character_table`, `battle_equip_table`), descriptions for operator skills, talents, and module upgrades contain pseudo-XML tags and blackboard variable placeholders.

To prevent security vulnerabilities (XSS) and maintain strict UI component isolation, **all descriptions are parsed into an Abstract Syntax Tree (AST) of structured nodes** without using `v-html`.

---

## 2. Real Data Scanning Report

Based on a comprehensive scan of all 29,324 active descriptions across 434 playable operators in `data/operators/*.json`:

### 2.1 Highlight Tags (`<@tag>...</>`)

These tags highlight gameplay values and operational remarks:

| Tag           | Frequency | Semantic Role                                           | Design Token / Color               |
| :------------ | :-------: | :------------------------------------------------------ | :--------------------------------- |
| `<@ba.vup>`   |  50,746   | Stat increase / positive effect / primary numeric value | Primary Highlight (Cyan `#00e5ff`) |
| `<@ba.vdown>` |   2,396   | Stat reduction / penalty / negative effect              | Warning / Penalty (Red `#ff1744`)  |
| `<@ba.rem>`   |   5,870   | Operational remark / prerequisite / penalty note        | Muted Caution (Amber `#ff9800`)    |
| `<@ba.talpu>` |   3,328   | Talent upgrade indicator                                | Talent Boost (Green `#00e676`)     |
| `<@ba.kw>`    |   2,956   | Special keyword or mechanic trigger                     | Tactical Accent (Gold / Amber)     |

_Closing Tag:_ Always `</>`.

### 2.2 Terminology Tooltips (`<$termId>...</>`)

These tags wrap terms defined in the official PRTS game glossary (`termDescriptionDict` in `constants.json`):

- **Unique terms found in texts:** 60 terms (e.g. `<$ba.stun>Stunned</>`, `<$ba.sleep>Sleep</>`, `<$ba.sluggish>Slow</>`, `<$ba.camou>Camouflage</>`).
- **Glossary coverage:** All 60 terms exist in `data/constants.json` (out of 147 total PRTS terms).
- _Interaction requirement:_ Terms render as interactive pills that display their official definition on mouse hover, mobile tap, and keyboard focus (`Tab`, `Enter`, `Space`).

### 2.3 Blackboard Placeholders (`{key:format}`)

Placeholders interpolate numbers from the skill level or module part blackboard.

- **Total placeholders evaluated:** 45,904
- **Resolved automatically:** 45,884 (99.96%)
- **Unresolved / dev anomalies:** 20 (only in Spot's Skill 1 `char_304_zebra`, which references `{duration}` while duration is a top-level skill property). Unresolved placeholders are preserved verbatim as `{duration}` with a safe warning in the parsing result.

#### Key Structure & Resolution Order:

1. Exact match in `blackboard[key]`
2. Case-insensitive match in `blackboard` (e.g. `attack_speed` vs `Attack_Speed`)
3. Strip leading `-` (negative flag, e.g. `{-max_hp:0%}` flips sign of `max_hp`)
4. Strip namespace prefix before `@` (e.g. `{attack@atk_scale:0%}` resolves `atk_scale`)

#### Formatting Specifications:

| Format Pattern | Frequency | Logic                                                    | Example                      |
| :------------- | :-------: | :------------------------------------------------------- | :--------------------------- |
| `0%`           |  27,696   | Multiply by 100, round to integer, append `%`            | `0.8` → `80%`                |
| `0.0%`         |    40     | Multiply by 100, format 1 decimal place, append `%`      | `0.125` → `12.5%`            |
| `0`            |    144    | Round to integer                                         | `3.0` → `3`                  |
| `0.0`          |    500    | Format with exactly 1 decimal place                      | `1.5` → `1.5`                |
| `(no format)`  |  17,524   | If integer print as integer, else up to 2 decimal places | `12` → `12`, `1.25` → `1.25` |

### 2.4 Literal Angle Brackets (Plain Text)

Game data also contains Chinese and English quotation-style brackets that are not formatting tags:

- `<Substitute>` / `<替身>` (424 occurrences)
- `<Support Device>` / `<Support Devices>` / `<支援装置>` (47 occurrences)

The parser preserves these as literal text without breaking tag parsing.

---

## 3. Node AST Schema

```typescript
export type RichTextNode =
  | { type: 'text'; text: string }
  | { type: 'highlight'; tag: string; children: RichTextNode[] }
  | {
      type: 'term'
      termId: string
      termName: string
      description: string
      children: RichTextNode[]
    }
  | { type: 'break' }
```

---

## 4. UI Rendering (`AkRichText.vue`)

- **Root container:** `<span class="ak-rich-text">` or `<div class="ak-rich-text">` (configurable via `as="span" | "div"`).
- **Zero `v-html`:** Entire output constructed via Vue template recursion or sub-components.
- **Accessibility:**
  - Terms render with `role="button"`, `tabindex="0"`, `aria-haspopup="dialog"`, `aria-expanded`.
  - Keyboard activation via `Enter` or `Space` toggles the definition popover.
  - Dismissible via `Escape` or clicking outside.
