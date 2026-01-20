# Build Size Playbook

Keeping the Better Habits binaries small helps installs finish quickly and keeps telemetry snappy. Use this checklist before shipping preview/production builds.

## 1. Measure IPA/AAB output

1. Run the desired build profile:

   ```bash
   eas build --platform ios --profile production --local --output build/youdomain.ipa
   eas build --platform android --profile production --local --output build/youdomain.aab
   ```

2. Inspect the artifacts:

   ```bash
   # Report size in MB
   node scripts/report-build-size.mjs build/youdomain.ipa
   node scripts/report-build-size.mjs build/youdomain.aab
   ```

3. Target budgets:

| Platform    | Target (soft) | Hard max                    |
| ----------- | ------------- | --------------------------- |
| Android AAB | ≤ 25 MB       | 100 MB (Play Console limit) |
| iOS IPA     | ≤ 30 MB       | 200 MB (App Store limit)    |

If you exceed the soft budget, check the bundle breakdown (step 2).

## 2. Inspect bundle contents

Generate bundle + assets for each platform:

```bash
mkdir -p build/bundles
npx react-native bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output build/bundles/index.ios.bundle \
  --assets-dest build/bundles

npx react-native bundle \
  --entry-file index.js \
  --platform android \
  --dev false \
  --bundle-output build/bundles/index.android.bundle \
  --assets-dest build/bundles
```

Pass the generated bundle paths to `scripts/report-build-size.mjs` to surface the top contributors:

```bash
node scripts/report-build-size.mjs build/bundles/index.ios.bundle --breakdown
```

## 3. Strip unused assets/locales

- Remove placeholder PNGs/SVGs from `assets/` before cutting release branches.
- Tamagui + Expo ship with dozens of `@formatjs/intl-*` locale files; only `en` is required today. If bundle size grows, add a Metro `resolver.blockList` entry for unused locales and document the whitelist in this folder.
- Confirm fonts and icon packs referenced in `tamagui.config.ts` exactly match what’s bundled. Remove unused weights to drop ~0.5–1 MB per font family.

## 4. Track changes over time

- Commit the output from `node scripts/report-build-size.mjs ... --breakdown` when large assets land, so PR reviewers can see the delta.
- The deploy checklist should include “Android/iOS artifact size within budget.” Failing the check blocks releases until the regression is understood.

Keeping these reports up to date means the Stage 7 database work—and eventual habit UI—won’t surprise us with bloated binaries later.\*\*\*
