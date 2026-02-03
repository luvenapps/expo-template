@./AGENTS.md

# Claude Code Instructions

## Communication Guidelines

**If you need my input, you MUST use the `AskUserQuestion` tool to ask.**

Do not make assumptions or proceed with uncertainty. When in doubt, ask.

## Before Writing Code

### 1. Verify Before Assuming

- **Read relevant existing files** to understand current implementations
- **Check actual file structures** - don't assume directory layouts or file locations
- **Verify function signatures** - read the actual code rather than guessing parameters or return types
- **Confirm implementations exist** - don't reference functions, classes, or modules that you haven't verified

### 2. When to Ask for Input

Ask me if you are:

- Unsure about an API or library usage
- Uncertain whether a feature, function, or file exists
- Unclear about requirements or expected behavior
- Considering multiple valid approaches and need direction
- About to make a significant architectural decision
- Unsure about naming conventions or code organization preferences

### 3. Research and Verification Process

Before implementing:

1. Read related files in the codebase to understand patterns and conventions
2. Check for existing utilities or helpers that solve similar problems
3. Verify dependencies and their versions in package.json (or equivalent)
4. Look for tests that demonstrate expected behavior
5. Review any existing documentation or README files

## Code Quality Standards

### Language Preferences

- **Default language: TypeScript** for all new code unless otherwise specified
- Use strict TypeScript settings
- Prefer type safety over `any` types

### Code Style

- Follow existing code style and conventions in the repository
- If no clear pattern exists, ask for preferences
- Maintain consistency with the existing codebase

### Implementation Approach

- Write clear, readable code with descriptive variable and function names
- Add comments for complex logic or non-obvious decisions
- Consider edge cases and error handling
- Prefer simple, maintainable solutions over clever tricks

### UI Components

- **Prefer Tamagui primitives** - Use built-in Tamagui components (`Button`, `Input`, `Card`, `YStack`, `XStack`, `View`, `Text`, etc.) instead of building custom components from scratch
- **Component hierarchy**:
  1. Use Tamagui primitives directly when possible
  2. Compose Tamagui primitives into reusable components for common patterns (e.g., `FormField`, `ScreenContainer`)
  3. Only build custom components when Tamagui doesn't provide the needed functionality
- **Styling**: Use Tamagui's theme tokens (`$background`, `$color`, `$borderColor`, etc.) for consistency across light/dark modes
- **Custom components**: Located in `src/ui/components/`
  - `ScreenContainer` - Page wrapper with safe area handling and keyboard avoidance
  - `FormField` - Input wrapper with label, helper text, and error states
  - `Text.tsx` - Semantic text components (`TitleText`, `SubtitleText`, `BodyText`, `LabelText`, `CaptionText`)
  - `PrimaryButton` - Styled button for primary actions
  - `Card` - Already provided by Tamagui; use directly
  - `UserOnly` - Auth gate for screens that require a signed-in user (redirects to login on unauthenticated)
- **When to create new components**:
  - Repeated patterns that combine multiple Tamagui primitives
  - Components that need consistent behavior across the app
  - Semantic wrappers that improve code readability

## Testing

- Look for existing test patterns before writing new tests
- Match the testing framework and style already in use
- Write tests for new functionality when appropriate
- **Use `testID` for UI components** - Avoid brittle assertions on translated text or dynamic content
  - Add `testID="descriptive-name"` to components for reliable test queries
  - Use `getByTestId('descriptive-name')` in tests instead of `getByText()`
  - Example: `<Button testID="submit-button">{t('common.submit')}</Button>`
  - This prevents tests from breaking when copy changes or translations are updated

## Documentation

- Update relevant documentation when changing functionality
- Add JSDoc/TSDoc comments for public APIs
- Keep README files current with code changes

## Error Prevention

- **Never hallucinate**: If you don't know something, verify it or ask
- **Don't make up**: File paths, function names, API endpoints, or library methods
- **Verify imports**: Check that modules and packages actually exist before using them
- **Confirm assumptions**: If you're about to assume something about the codebase, verify it first

## Project Context

When starting work:

1. Read the README to understand the project
2. Check package.json for dependencies and scripts
3. Look for configuration files (tsconfig.json, .eslintrc, etc.)
4. Review the directory structure to understand organization

---

Remember: **Verification over assumption. Questions over guesses.**

## Response Formatting

- When the user requests a commit message, respond with two separate fenced code blocks (title first, body second) so they can copy them easily.
- After finishing any coding task, proactively provide the commit title/body in that format without waiting for the user to ask.
- Do not modify files outside the requested scope unless the user explicitly approves it—ask first if you’re unsure.
