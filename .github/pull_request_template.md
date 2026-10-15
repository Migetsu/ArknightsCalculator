## PR Checklist

### 1. Manual Approval Stop-List (AGENTS.md §14)

Does this PR touch any of the following restricted areas?

- [ ] `.github/**` workflows, CI/CD configuration, runner permissions
- [ ] Repository secrets, token permissions (`GITHUB_TOKEN` scopes, PATs)
- [ ] Supabase schema / migrations / RLS policies
- [ ] Authentication / Authorization logic
- [ ] Yostar synchronization / login tokens / proxy secrets
- [ ] Major package dependency upgrades
- [ ] Weakening, deleting, or skipping tests (`test.skip`)
- [ ] Unverified formulas, assumptions, or dataset discrepancies (>25% data growth)

> [!WARNING]
> If ANY of the items above is checked, the autonomous agent **MUST NOT** self-merge this PR and must await explicit manual review and approval by the project owner.

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
