# Operator Handbook Dataset (data/handbook/<charId>.json)

## 1. Overview & Architecture

The operator handbook dataset contains the complete lore, biographical profile, physical evaluation/combat tests, and archival stories for all playable Arknights operators.

In accordance with architectural guidelines (`AGENTS.md` §3 and §13):

- **Per-operator file layout**: Handbooks are stored as individual files in `data/handbook/<charId>.json` (e.g. `data/handbook/char_002_amiya.json`) rather than a single monolithic file or bloated into `data/operators/*.json`.
- **On-demand lazy loading**: When viewing an operator's detail page, opening the "Dossier / Archive" tab loads only that specific operator's file (~25 KB average) over the network or via dynamic import, rather than forcing the client to download an 11 MB monolithic JSON payload. This is critical for mobile devices and slow connections.
- **Approved §14 exception**: The size growth of the `data/` directory by +39.3% (+10.97 MB, 27.94 MB -> 38.91 MB) was deliberately reviewed and approved by the project owner on 2026-10-19 due to the inherent volume of narrative prose stories across 432 operators.

## 2. Structure & Schemas

### 2.1 Types (`shared/schemas/handbook.ts`)

Each operator handbook is typed as `OperatorHandbook`:

```ts
interface OperatorHandbook {
  charId: string
  infoName: LayeredI18nString
  profile: HandbookProfile
  physicalExam: HandbookPhysicalExam
  stories: HandbookStory[]
}
```

### 2.2 Structured Sections (`profile` & `physicalExam`)

Raw handbook entries begin with "Basic Info" (`[Basic Info]` / `【基础档案】`) and "Physical Exam" (`[Physical Exam]` / `【综合体检测试】`).
These are parsed from raw tagged text into typed key-value pairs:

- **Profile fields**: `codeName`, `gender`, `combatExperience`, `placeOfBirth`, `dateOfBirth`, `race`, `height`, `infectionStatus`.
  - Non-standard robot fields (e.g. Lancet-2, Castle-3): `model`, `manufacturer`, `placeOfProduction`, `timeInService`, `dateOfRelease`, `inspectionReport`.
  - Academic collab fields (e.g. Persona): `academicGrade`.
- **Physical evaluation fields**: `physicalStrength`, `mobility`, `physicalResilience`, `tacticalAcumen`, `combatSkill`, `originiumArtsAssimilation`.
  - Robot performance tests: `topSpeed`, `climb`, `brake`, `passability`, `endurance`, `structuralIntegrity`.
  - Collab academic tests: `academicLevel`, `physicalFitness`, `mentalHealth`, `socialPractice`, `communicationSkill`.
- **Universal iteration**: Both `profile` and `physicalExam` provide an `allFields: HandbookItem[]` array preserving the original table ordering, canonical keys, localized titles, and localized values for generic UI rendering.

### 2.3 Edge Case: Multiline Tag Values

In official game tables, some tag headers (notably Amiya's `[Infection Status]`) contain an empty value on the tag line, followed by multiple paragraphs on subsequent lines.
`parseTaggedSection` handles both inline values (`[Tag] Value`) and multiline block values seamlessly.

## 3. Prose Stories & Archival Records

Remaining sections (`Profile`, `Clinical Analysis`, `Archive File 1-4`, `Promotion Record`, etc.) are preserved in `stories: HandbookStory[]`:

- `storyTitle`: `LayeredI18nString` ({ en, zh, source, isMachineTranslation })
- `text`: `LayeredI18nString` ({ en, zh, source, isMachineTranslation })
- `unlockType`: e.g. `DIRECT`, `FAVOR`, `PATCH`
- `unlockParam`: optional string parameter (e.g. target alternative form ID)
- `patchCharId`: set for class conversion / patch records (e.g. `char_1001_amiya2` Guard Amiya, `char_1037_amiya3` Medic Amiya).

## 4. Filtering & Deduplication

### 4.1 Identical Duplicates

When raw tables repeat an identical story title and identical text within the same operator record (e.g. Amiya's second "Physical Exam" and second "Profile" records in raw tables), duplicate entries are cleanly dropped. Distinct stories sharing a title (e.g. Amiya's updated "Basic Info" with height 150cm vs 142cm) are preserved.

### 4.2 Stubs and Placeholders

Stories consisting entirely of question mark placeholders (e.g. `？？？` with ` ？？？？？？\n`) are stripped from the dataset to avoid rendering useless empty panels.

## 5. Localization & Fallback

- For operators released on Global (415 operators), both `en` and `zh` are populated with official texts.
- For operators currently exclusive to CN (17 operators), fields are resolved through `resolveLayeredI18nString` with `source: 'pending'`, `en: '[Pending Translation]'`, and `zh` populated with official CN text.
- Validation strictly enforces that no Chinese ideographs (`[\u4e00-\u9fa5]`) exist in any `en` fields across the entire handbook dataset.

## 6. Build and Validation Scripts

- **Build**: `npm run data:handbook` (`scripts/data/build-handbook.ts`) writes 432 files into `data/handbook/<charId>.json` and cleans up legacy monolithic `data/handbook.json`.
- **Validation**: `npm run data:validate` (`scripts/data/validate-data.ts`) validates all 432 files against `OperatorHandbookSchema`, checks referential integrity against `data/operators/`, and verifies no monolithic file exists.
- **Unit Tests**: `tests/unit/shared/handbook.test.ts`
