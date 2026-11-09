# Tests

- Match nearby Jest and React Native Testing Library patterns. Read `setup.ts`
  and `../jest.config.js` before adding mocks or changing test configuration.
- Mirror the source layout and cover meaningful behavior, errors, and platform
  differences. Keep mocks consistent with actual module exports and signatures.
- Prefer stable `testID` queries over translated or dynamic text. For i18n tests,
  follow the existing translation mocks and assert translation keys where appropriate.
- Native modules must remain usable in the Node test environment through mocks.
- Run scoped coverage for the source file under test, not just its test file:
  `npx jest --runInBand --coverage --collectCoverageFrom='<source-file>' --runTestsByPath <test-file>`.
- After per-file coverage passes, run full `npm test`; its pretest runs type checking.
