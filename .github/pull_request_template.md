## PR Checklist

### 1. Manual Approval Stop-List (AGENTS.md §14)

Does this PR touch any of the following restricted areas?

- [ ] Repository secrets, token permissions, `.env.example`
- [ ] Supabase production schema / migrations / RLS policies
- [ ] Yostar synchronization / login integration
- [ ] Weakening, deleting, or skipping tests (`test.skip`)
- [ ] Unverified formulas, assumptions, or dataset/bundle growth (>25%)

> [!WARNING]
> If ANY of the items above is checked, the autonomous agent **MUST NOT** self-merge this PR and must await explicit manual review and approval by the project owner. (.github/**, CI/CD, dependencies, licenses, and disclaimers are self-mergeable by agent if quality gates pass).

### 2. Automated Quality Gates

- [ ] `npm run lint` passes without warnings or errors
- [ ] `npm run stylelint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run format:check` passes
- [ ] `npm run i18n:check` passes
- [ ] `npm run data:validate` passes
- [ ] `npm run test` (unit tests) passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run build` succeeds
- [ ] Layout sanity tests verified on 360px and 1440px viewports (no horizontal overflow)
