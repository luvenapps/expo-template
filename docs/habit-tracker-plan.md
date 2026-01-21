# BetterHabits: Comprehensive Habit Tracker Implementation Plan

## Overview

Transform BetterHabits into a full-featured habit tracker inspired by Done, Streaks, Productive, and HabitKit apps. The existing infrastructure (SQLite, Drizzle, Supabase sync, auth, Tamagui UI) is complete—this plan focuses on building the domain-specific UI and features.

### Plan Updates (Scope/Quality)

Add explicit data/sync work, reminders integration, web strategy, acceptance criteria, and test coverage so each phase is shippable.

---

## Design System & Visual Identity

### Design Philosophy

Create a **calm, focused, and delightful** experience that motivates users without overwhelming them. The design should feel:

- **Minimal but warm** — Clean interfaces with subtle personality
- **Satisfying to use** — Micro-interactions that reward completion
- **Glanceable** — Key info visible at a glance (streaks, progress, today's status)
- **Consistent** — Unified visual language across all screens

### Color Palette

#### Brand Colors

| Name              | Hex                | Usage                                     |
| ----------------- | ------------------ | ----------------------------------------- |
| **Primary**       | `#6366F1` (Indigo) | CTAs, active states, accent highlights    |
| **Primary Light** | `#818CF8`          | Hover states, secondary accents           |
| **Primary Dark**  | `#4F46E5`          | Pressed states, text on light backgrounds |

#### Semantic Colors

| Name        | Light Mode | Dark Mode | Usage                                        |
| ----------- | ---------- | --------- | -------------------------------------------- |
| **Success** | `#10B981`  | `#34D399` | Completed habits, streaks, positive feedback |
| **Warning** | `#F59E0B`  | `#FBBF24` | Approaching deadline, attention needed       |
| **Danger**  | `#EF4444`  | `#F87171` | Delete actions, missed habits, errors        |
| **Muted**   | `#6B7280`  | `#9CA3AF` | Secondary text, disabled states              |

#### Habit Colors (User-selectable)

```
#EF4444 (Red)      #F97316 (Orange)   #F59E0B (Amber)    #84CC16 (Lime)
#22C55E (Green)    #14B8A6 (Teal)     #06B6D4 (Cyan)     #3B82F6 (Blue)
#6366F1 (Indigo)   #8B5CF6 (Violet)   #EC4899 (Pink)     #78716C (Stone)
```

#### Background & Surface

| Element              | Light Mode         | Dark Mode |
| -------------------- | ------------------ | --------- |
| **Background**       | `#FAFAFA`          | `#0A0A0A` |
| **Surface** (cards)  | `#FFFFFF`          | `#171717` |
| **Surface Elevated** | `#FFFFFF` + shadow | `#262626` |
| **Border**           | `#E5E5E5`          | `#404040` |

### Typography

#### Font Stack

- **Primary**: System font (SF Pro on iOS, Roboto on Android) for optimal readability
- **Monospace**: For numbers/stats (SF Mono / Roboto Mono) — optional accent

#### Type Scale (using Tamagui tokens)

| Style          | Size      | Weight | Line Height | Usage                           |
| -------------- | --------- | ------ | ----------- | ------------------------------- |
| **Display**    | 32px ($9) | 700    | 1.2         | Landing hero headline           |
| **Title 1**    | 28px ($8) | 700    | 1.25        | Screen titles                   |
| **Title 2**    | 22px ($7) | 600    | 1.3         | Section headers                 |
| **Title 3**    | 18px ($6) | 600    | 1.35        | Card titles, habit names        |
| **Body**       | 16px ($5) | 400    | 1.5         | Primary content                 |
| **Body Small** | 14px ($4) | 400    | 1.5         | Secondary content               |
| **Caption**    | 12px ($3) | 500    | 1.4         | Labels, metadata, streak counts |
| **Overline**   | 11px ($2) | 600    | 1.3         | Uppercase labels, badges        |

### Spacing System

Use consistent spacing based on 4px grid (Tamagui `$space` tokens):

| Token | Value | Usage                         |
| ----- | ----- | ----------------------------- |
| `$1`  | 4px   | Tight spacing (icon padding)  |
| `$2`  | 8px   | Related elements              |
| `$3`  | 12px  | Component internal padding    |
| `$4`  | 16px  | Standard gap between elements |
| `$5`  | 20px  | Section padding               |
| `$6`  | 24px  | Card padding                  |
| `$8`  | 32px  | Section separation            |
| `$10` | 40px  | Major section breaks          |

### Border Radius

| Element          | Radius       | Token   |
| ---------------- | ------------ | ------- |
| **Buttons**      | 12px         | `$4`    |
| **Cards**        | 16px         | `$5`    |
| **Inputs**       | 10px         | `$3`    |
| **Chips/Badges** | 20px (pill)  | `$10`   |
| **FAB**          | 50% (circle) | `$true` |
| **Avatars**      | 50% (circle) | `$true` |

### Shadows & Elevation

| Level      | Usage                     | Light Mode                    | Dark Mode                    |
| ---------- | ------------------------- | ----------------------------- | ---------------------------- |
| **None**   | Flat elements             | —                             | —                            |
| **Low**    | Cards, inputs             | `0 1px 3px rgba(0,0,0,0.08)`  | `0 1px 3px rgba(0,0,0,0.3)`  |
| **Medium** | Elevated cards, dropdowns | `0 4px 12px rgba(0,0,0,0.1)`  | `0 4px 12px rgba(0,0,0,0.4)` |
| **High**   | Modals, FAB               | `0 8px 24px rgba(0,0,0,0.15)` | `0 8px 24px rgba(0,0,0,0.5)` |

### Iconography

#### Icon Set

- **Primary**: Lucide Icons (already in project via `@tamagui/lucide-icons`)
- **Style**: Outline style (2px stroke), 24x24 default size
- **Touch targets**: Minimum 44x44px for accessibility

#### Common Icons

| Action    | Icon           | Notes                 |
| --------- | -------------- | --------------------- |
| Add habit | `Plus`         | FAB and empty state   |
| Complete  | `Check`        | Quick-log button      |
| Edit      | `Pencil`       | Edit actions          |
| Delete    | `Trash2`       | Destructive actions   |
| Settings  | `Settings`     | Navigation            |
| Reminder  | `Bell`         | Notification settings |
| Streak    | `Flame`        | Streak display        |
| Calendar  | `Calendar`     | Date picker, heatmap  |
| Archive   | `Archive`      | Archive habit         |
| Back      | `ChevronLeft`  | Navigation            |
| More      | `MoreVertical` | Overflow menu         |

### Component Design Specs

#### HabitCard

```
┌─────────────────────────────────────────────────────────┐
│  ┌────┐                                        ┌─────┐  │
│  │ 🏃 │  Exercise                              │  ✓  │  │
│  │icon│  🔥 12 day streak                      │check│  │
│  └────┘                                        └─────┘  │
└─────────────────────────────────────────────────────────┘

- Height: 72-80px
- Padding: 16px horizontal, 12px vertical
- Icon container: 44x44px with habit color background (10% opacity)
- Color indicator: Left border (4px) OR icon background tint
- Quick-log button: 44x44px circle, primary color when incomplete, success when done
- Streak badge: Inline with habit name, muted text + flame icon
- Press state: Scale 0.98, slight shadow reduction
```

#### QuickLogButton

```
     ○ (Incomplete)          ✓ (Complete)
   ┌─────────┐             ┌─────────┐
   │         │             │    ✓    │
   │    ○    │  ──tap──►   │         │
   │         │             │ (green) │
   └─────────┘             └─────────┘

- Size: 44x44px (touch target) or 32x32px (visual)
- Incomplete: Border only (2px), muted color
- Complete: Filled with success color, white checkmark
- Animation: Scale bounce 1.0 → 1.2 → 1.0 + checkmark draw
- Haptic: Light impact on completion
```

#### FloatingActionButton

```
       ┌─────┐
       │  +  │
       └─────┘

- Size: 56x56px
- Position: Bottom-right, 16px margin from edges
- Color: Primary gradient or solid
- Shadow: High elevation
- Icon: Plus, 24px, white
- Animation: Scale from 0 on mount, rotate 90° on press
```

#### Empty State

```
     ┌─────────────────────────────┐
     │                             │
     │      ┌───────────────┐      │
     │      │   📝          │      │
     │      │  illustration │      │
     │      └───────────────┘      │
     │                             │
     │    No habits yet            │
     │    Start building better    │
     │    habits today!            │
     │                             │
     │    [ Create First Habit ]   │
     │                             │
     └─────────────────────────────┘

- Illustration: Simple, friendly (can use placeholder SVG)
- Title: Title 2 weight, centered
- Description: Body, muted color, centered
- CTA: Primary button, full width with max-width
- Spacing: Generous vertical spacing ($8 between elements)
```

#### StatCard

```
┌──────────────────┐
│  Current Streak  │  ← Label (caption, muted)
│       12         │  ← Value (title 1, bold)
│      days        │  ← Unit (caption, muted)
└──────────────────┘

- Min width: 100px
- Padding: 16px
- Background: Surface color
- Border radius: 16px
- Alignment: Center
- Optional: Icon above label
```

### Motion & Animation Principles

1. **Purpose over decoration**: Every animation should communicate state change or provide feedback
2. **Quick and snappy**: Most animations 150-250ms, never exceed 400ms
3. **Natural easing**: Use spring physics (`withSpring`) for organic feel
4. **Respect preferences**: Honor `reduceMotion` system setting
5. **Delight on completion**: Extra satisfying feedback for habit completion

### Accessibility Guidelines

- **Color contrast**: Minimum 4.5:1 for body text, 3:1 for large text
- **Touch targets**: Minimum 44x44px for all interactive elements
- **Focus indicators**: Visible focus rings for keyboard navigation
- **Screen reader**: Meaningful labels for all interactive elements
- **Dynamic type**: Support iOS/Android font scaling
- **Reduce motion**: Disable animations when system preference is set

### Dark Mode Considerations

- Avoid pure black (`#000000`) — use `#0A0A0A` or similar for less eye strain
- Reduce shadow intensity in dark mode
- Ensure habit colors have sufficient contrast in both modes
- Use lighter versions of semantic colors in dark mode
- Test all screens in both modes

### Design Tokens (Tamagui Config Updates)

```typescript
// Add to tamagui.config.ts
const habitColors = {
  habitRed: '#EF4444',
  habitOrange: '#F97316',
  habitAmber: '#F59E0B',
  habitLime: '#84CC16',
  habitGreen: '#22C55E',
  habitTeal: '#14B8A6',
  habitCyan: '#06B6D4',
  habitBlue: '#3B82F6',
  habitIndigo: '#6366F1',
  habitViolet: '#8B5CF6',
  habitPink: '#EC4899',
  habitStone: '#78716C',
};

const semanticColors = {
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  danger: '#EF4444',
  dangerLight: '#F87171',
};
```

---

## AI Design Prompts

Use these prompts with AI design tools to generate visual mockups and UI components. Copy the relevant prompt and paste into your preferred tool.

### Recommended AI Design Tools

| Tool                   | Best For                                        | URL                       |
| ---------------------- | ----------------------------------------------- | ------------------------- |
| **v0.dev**             | React/Tailwind components, rapid prototyping    | https://v0.dev            |
| **Galileo AI**         | Full app mockups, mobile-first designs          | https://www.usegalileo.ai |
| **Uizard**             | Wireframes to high-fidelity, team collaboration | https://uizard.io         |
| **Figma AI (Plugins)** | Design system generation, auto-layout           | https://figma.com         |
| **Midjourney/DALL-E**  | Illustrations, app mockup hero images           | —                         |

---

### Prompt 1: Home Screen (Habit List)

**Use with**: v0.dev, Galileo AI, Uizard

```
Design a mobile habit tracker home screen with these specifications:

**Header:**
- Personalized greeting: "Good morning, Sarah" (large, bold)
- Current date below: "Tuesday, January 21"
- Clean, minimal top padding

**Habit List:**
- Vertical list of habit cards
- Each card contains:
  - Left: Colored circle icon (44x44px) with habit emoji/icon
  - Center: Habit name (bold) + streak badge ("🔥 12 days" in muted text)
  - Right: Circular checkbox button (44x44px)
    - Unchecked: outline only, muted border
    - Checked: filled green (#22C55E) with white checkmark

**Card styling:**
- White background, subtle shadow
- 16px border radius
- 16px padding
- 4px colored left border matching habit color
- 12px gap between cards

**Floating Action Button:**
- Bottom right corner, 16px from edges
- 56x56px circle, indigo (#6366F1)
- White plus icon
- High shadow elevation

**Empty state (alternate version):**
- Centered illustration placeholder
- "No habits yet" title
- "Start building better habits today!" subtitle
- Primary CTA button: "Create First Habit"

**Colors:**
- Background: #FAFAFA
- Cards: #FFFFFF
- Primary: #6366F1 (indigo)
- Success: #22C55E (green)
- Text: #171717
- Muted: #6B7280

**Typography:**
- System font (SF Pro / Roboto)
- Greeting: 28px, weight 700
- Date: 14px, muted color
- Habit name: 18px, weight 600
- Streak: 12px, muted

**Style:** Clean, minimal, iOS-inspired, modern habit tracker app
```

---

### Prompt 2: Create Habit Screen

**Use with**: v0.dev, Galileo AI, Uizard

```
Design a mobile "Create New Habit" form screen:

**Navigation:**
- Header with back arrow (left), title "New Habit" (center)
- Optional "Save" text button (right, primary color)

**Form Fields:**

1. **Name Input**
   - Label: "Habit Name"
   - Placeholder: "e.g., Exercise, Read, Meditate"
   - Full width, 48px height, 10px border radius
   - Border: #E5E5E5, focus: #6366F1

2. **Icon Picker**
   - Label: "Choose Icon"
   - Horizontal scrollable row of 12 icon options
   - Icons: 🏃 📖 💪 🧘 💧 😴 🎯 ✍️ 🎵 🥗 💊 ⭐
   - Selected: indigo border ring + slight scale

3. **Color Picker**
   - Label: "Choose Color"
   - Grid of 12 color circles (3x4 or 4x3)
   - Colors: Red, Orange, Amber, Lime, Green, Teal, Cyan, Blue, Indigo, Violet, Pink, Stone
   - Selected: white checkmark overlay + ring

4. **Frequency Selector**
   - Label: "How often?"
   - Segmented control: "Daily" | "Weekly" | "Custom"
   - If Custom: show 7 day toggles (S M T W T F S)

5. **Goal Input**
   - Label: "Daily Goal"
   - Stepper: minus button | number (default: 1) | plus button
   - Subtext: "times per day"

**Primary CTA:**
- Full width button at bottom
- Text: "Create Habit"
- Indigo background, white text
- 12px border radius, 48px height

**Spacing:**
- 24px section gaps
- 8px label-to-input gaps
- 16px horizontal padding

**Style:** Clean form design, iOS-style inputs, accessible touch targets
```

---

### Prompt 3: Habit Detail Screen

**Use with**: v0.dev, Galileo AI, Uizard

```
Design a mobile habit detail/analytics screen:

**Header:**
- Back arrow (left)
- Habit name centered: "Exercise" with colored dot indicator
- Edit pencil icon (right)

**Today Card (Hero):**
- Large card at top
- "Today" label
- Large circular progress/completion button (80x80px)
- Current count: "2 / 3" below button
- Tap to increment counter

**Stats Row:**
- 3 equal-width stat cards in horizontal row
- Each card:
  - Small label (muted): "Current Streak" / "Best Streak" / "Completion"
  - Large number: "12" / "28" / "87%"
  - Unit below (muted): "days" / "days" / "rate"
- White background, subtle shadow, 12px radius

**Calendar Heatmap:**
- Section title: "Last 90 Days"
- GitHub-style contribution grid
- 7 rows (days of week) × ~13 columns (weeks)
- Color intensity based on completions:
  - 0: #E5E5E5 (empty)
  - 1: light green
  - 2+: darker green (#22C55E)
- Month labels above

**Recent Activity:**
- Section title: "Recent"
- List of last 7 entries
- Each row: Date (left) + checkmark/count (right)
- Example: "Today" ✓, "Yesterday" ✓, "Jan 19" ✓

**Reminder Card:**
- Small card with bell icon
- "Reminder: 7:00 AM daily"
- Chevron right to edit

**Colors & Style:**
- Same design system as home screen
- Habit's color used as accent throughout
- Clean, data-focused, motivating

**Typography:**
- Screen title: 22px, weight 600
- Stat numbers: 32px, weight 700
- Stat labels: 12px, muted
- Section headers: 16px, weight 600
```

---

### Prompt 4: Web Landing Page

**Use with**: v0.dev, Framer, Galileo AI

```
Design a modern SaaS landing page for a habit tracking app called "BetterHabits":

**Hero Section:**
- Large headline: "Build Better Habits, One Day at a Time"
- Subheadline: "The simple, beautiful habit tracker that helps you stay consistent and achieve your goals."
- Two CTAs: "Download Free" (primary, indigo) | "Learn More" (secondary, outline)
- Right side: iPhone mockup showing the app home screen
- Subtle gradient background (light indigo to white)

**Features Section:**
- Section title: "Everything you need to build lasting habits"
- 4 feature cards in 2x2 grid:
  1. 🔥 "Streak Tracking" - Never break the chain with visual streak counters
  2. 🔔 "Smart Reminders" - Gentle nudges at the perfect time
  3. 📊 "Beautiful Analytics" - See your progress with intuitive charts
  4. ☁️ "Sync Everywhere" - Your habits follow you across all devices
- Each card: Icon, title, description, subtle shadow

**How It Works:**
- 3 steps with illustrations/icons:
  1. "Create Your Habits" - Define what matters to you
  2. "Check In Daily" - One tap to log your progress
  3. "Watch Yourself Grow" - See your streaks and stats improve

**Testimonials:**
- Section title: "Loved by habit builders"
- 3 testimonial cards with:
  - Quote text
  - Avatar placeholder
  - Name + "BetterHabits user"
- Carousel on mobile

**Pricing:**
- Simple section showing "Free" badge
- List of included features with checkmarks
- "Pro coming soon" subtle badge
- CTA: "Start Free Today"

**Footer:**
- Logo (left)
- Links: Privacy Policy | Terms of Service | Support
- Social icons placeholder
- Copyright: "© 2026 BetterHabits"

**Design specs:**
- Max width: 1200px centered
- Primary: #6366F1 (indigo)
- Background: #FAFAFA
- Cards: White with subtle shadows
- Modern, clean, trustworthy SaaS aesthetic
- Responsive (show mobile + desktop versions)
```

---

### Prompt 5: Settings Screen

**Use with**: v0.dev, Galileo AI

```
Design a mobile app settings screen:

**Header:**
- Title: "Settings" (large, bold, left-aligned)

**Profile Section:**
- User avatar circle (placeholder)
- Name: "Sarah Johnson"
- Email: "sarah@example.com"
- Chevron right to edit profile
- Subtle card background

**Sections with grouped rows:**

**Account**
- Profile (with chevron)
- Sign Out (red text, no chevron)

**Preferences**
- Notifications (with toggle)
- Dark Mode (with toggle)
- Language (shows "English", chevron)

**Data**
- Export Data (chevron) [show lock icon - premium]
- Sync Status (shows "Synced ✓")

**About**
- Privacy Policy (chevron, opens link)
- Terms of Service (chevron, opens link)
- Contact Support (chevron, opens link)
- Version (shows "1.0.0", no chevron, muted)

**Row styling:**
- 56px height
- 16px horizontal padding
- Left icon (24px, muted) + Label + Right element (toggle/chevron/value)
- Dividers between rows (1px, very light)
- Grouped in cards with 16px radius

**Section headers:**
- Uppercase, 12px, muted, extra letter spacing
- 24px top margin, 8px bottom margin

**Colors:**
- Background: #FAFAFA
- Cards: #FFFFFF
- Destructive: #EF4444
- Toggles: #6366F1 when on

**Style:** iOS Settings app inspired, clean, accessible
```

---

### Prompt 6: Empty States & Illustrations

**Use with**: Midjourney, DALL-E, Figma Plugins

```
Create a set of minimal, friendly illustrations for a habit tracking app:

**Style guidelines:**
- Flat design, minimal details
- Soft, muted color palette (indigo, teal, warm neutrals)
- Consistent line weight (2px)
- Rounded corners, friendly shapes
- No faces or detailed human figures (use abstract shapes)
- Suitable for light and dark backgrounds

**Illustrations needed:**

1. **Empty habits state**
   - Concept: Empty checklist or blank canvas
   - Elements: Floating checkbox, sparkles, plant growing
   - Mood: Optimistic, potential, fresh start

2. **Streak celebration**
   - Concept: Achievement unlocked
   - Elements: Fire/flame, confetti, trophy
   - Mood: Exciting, rewarding, celebratory

3. **First habit created**
   - Concept: Beginning of journey
   - Elements: Seedling, sunrise, path starting
   - Mood: Hopeful, encouraging

4. **All habits complete**
   - Concept: Daily victory
   - Elements: Checkmarks, stars, completion badge
   - Mood: Satisfied, accomplished

5. **No data yet (analytics)**
   - Concept: Charts waiting for data
   - Elements: Empty bar chart, magnifying glass
   - Mood: Curious, anticipating

**Size:** 200x200px base, SVG format preferred
**Background:** Transparent
```

---

### Prompt 7: App Store Screenshots

**Use with**: Figma, Galileo AI, Midjourney

```
Design App Store promotional screenshots for a habit tracker app (6.5" iPhone size: 1284 x 2778px):

**Screenshot 1 - Hero**
- Headline: "Build Better Habits"
- Subtext: "Track your daily progress with ease"
- Show home screen with 3-4 habits
- Gradient background (indigo to purple)

**Screenshot 2 - Streaks**
- Headline: "Never Break the Chain"
- Subtext: "Visual streaks keep you motivated"
- Show habit detail with streak counter prominent
- Fire emoji accent

**Screenshot 3 - Analytics**
- Headline: "See Your Progress"
- Subtext: "Beautiful charts and insights"
- Show calendar heatmap and stats
- Graph/chart visual accent

**Screenshot 4 - Reminders**
- Headline: "Gentle Reminders"
- Subtext: "Stay on track with smart notifications"
- Show notification mockup or reminder settings
- Bell icon accent

**Screenshot 5 - Dark Mode**
- Headline: "Day or Night"
- Subtext: "Beautiful in light and dark mode"
- Split screen showing both modes
- Moon/sun icon accent

**Layout for each:**
- Device frame (optional, modern style)
- Headline: 64px, bold, white
- Subtext: 32px, white/80% opacity
- Phone screenshot centered
- Colorful gradient backgrounds
- Consistent padding and alignment

**Style:** Modern App Store aesthetic, clean typography, lifestyle feel
```

---

### Tips for Using These Prompts

1. **Iterate**: Start with the base prompt, then refine with follow-ups like "make it more minimal" or "increase contrast"

2. **Reference images**: If the tool supports it, upload screenshots of Done, Streaks, or Productive apps as style references

3. **Component extraction**: After generating full screens, ask for specific components: "Now show me just the HabitCard component with hover states"

4. **Responsive variations**: Ask for "mobile and tablet versions" or "light and dark mode variants"

5. **Export formats**: Request "export as Figma components" or "generate React/Tailwind code" depending on tool capabilities

6. **Animation specs**: Follow up with "add micro-interaction annotations" or "describe the animations for each interactive element"

---

### Competitor Inspiration

- **Done**: Calendar view with circles/X marks, "don't break the chain" philosophy
- **Streaks**: Up to 24 tasks, flexible scheduling, Apple Health integration
- **Productive**: Habit templates, detailed analytics, social challenges, 15M+ downloads
- **HabitKit**: Tile-based grid charts, privacy-first local storage, clean minimal design

---

## Impact on Existing Screens

| Screen                              | Action            | Details                                                    |
| ----------------------------------- | ----------------- | ---------------------------------------------------------- |
| `app/(tabs)/index.tsx`              | **Replace**       | Generic welcome → Full habit list with quick-log           |
| `app/index.tsx` (Web Landing)       | **Enhance**       | Minimal landing → Full marketing page                      |
| `app/(tabs)/settings/index.tsx`     | **Minor updates** | Add legal links (Privacy, Terms, Support) + Export section |
| `app/(tabs)/settings/profile.tsx`   | **Keep as-is**    | Already complete                                           |
| `app/(tabs)/settings/database.tsx`  | **Keep as-is**    | Dev tool, already complete                                 |
| `app/(auth)/login.tsx`              | **Keep as-is**    | Already complete                                           |
| `app/(auth)/signup.tsx`             | **Keep as-is**    | Already complete                                           |
| `app/(auth)/forgot-password.tsx`    | **Keep as-is**    | Already complete                                           |
| `app/(auth)/auth-callback.tsx`      | **Keep as-is**    | Already complete                                           |
| `app/_layout.tsx`                   | **Keep as-is**    | Root layout, no changes needed                             |
| `app/(tabs)/_layout.tsx`            | **Keep as-is**    | Tab navigator, no changes needed                           |
| `NamePromptModal` (in AppProviders) | **Keep as-is**    | First-install name capture modal, already complete         |

**Summary**: Only **2 screens are replaced/enhanced** (Home + Web Landing). All auth, settings, and the name prompt modal remain unchanged.

### Name Prompt Modal (Stays Unchanged)

The "Add your name" prompt is a **modal** (not a separate screen) that:

- Lives in `src/ui/providers/AppProviders.tsx`
- Pops up automatically on first install if no name is found
- Saves name to local storage via `setLocalName()`
- Will continue to work exactly as-is
- The saved name will be used for personalized greetings on the new home screen

---

## Phase 1: Core Habit Management (Home Screen)

**Goal**: Replace stub home screen with functional habit list + quick-logging.

### Current State (Will Be Replaced)

The current `app/(tabs)/index.tsx` is a **generic placeholder**:

- Shows "Welcome to Better Habits" title
- Generic subtitle + "Get Started" button → Settings
- No habit functionality

This will be **completely replaced** with the actual habit tracker home screen.

### New Routes

- None (modify existing `app/(tabs)/index.tsx`)

### New Components (`src/ui/components/`)

| Component                  | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `HabitCard.tsx`            | Single habit row: name, color indicator, streak badge, quick-log button |
| `HabitList.tsx`            | FlatList of HabitCard items with pull-to-refresh                        |
| `QuickLogButton.tsx`       | Circular tap-to-complete button with checkmark animation                |
| `EmptyHabitsState.tsx`     | "No habits yet" illustration + CTA                                      |
| `FloatingActionButton.tsx` | "+" FAB to create new habit                                             |

### Animations (react-native-reanimated)

Polished micro-interactions make the app feel delightful. Use `react-native-reanimated` (already in project) for smooth 60fps animations.

| Animation                  | Component              | Description                                                       |
| -------------------------- | ---------------------- | ----------------------------------------------------------------- |
| **Quick-log completion**   | `QuickLogButton`       | Scale bounce (1.0 → 1.2 → 1.0) + checkmark draw animation on tap  |
| **Streak counter**         | `HabitCard`            | Number counting up animation when streak increases                |
| **Card press feedback**    | `HabitCard`            | Subtle scale down (0.98) on press with spring back                |
| **FAB press**              | `FloatingActionButton` | Scale (0.9) + slight rotate on tap, spring back                   |
| **FAB appearance**         | `FloatingActionButton` | Scale from 0 + fade in on mount with spring                       |
| **List item enter**        | `HabitList`            | Staggered fade-in + slide-up (translateY: 20 → 0) when list loads |
| **Empty state**            | `EmptyHabitsState`     | Gentle bounce loop on illustration, fade-in on mount              |
| **Color picker selection** | `ColorPicker`          | Scale pop (1.0 → 1.15 → 1.0) + ring highlight on selected color   |
| **Stats counter**          | `StatCard`             | Animated number counting from 0 to value on mount                 |
| **Calendar cell tap**      | `CalendarHeatmap`      | Brief pulse animation on cell tap                                 |
| **Confirm dialog**         | `ConfirmDialog`        | Scale + fade overlay entrance, spring content                     |
| **Form field focus**       | `HabitForm`            | Border color transition + subtle lift (translateY: -2) on focus   |
| **Button press**           | All buttons            | Scale down (0.96) with spring, optional haptic feedback           |
| **Page transitions**       | Navigation             | Shared element transitions for habit card → detail (if feasible)  |

#### Animation Utilities (`src/ui/animations/`)

| Utility                 | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `useScalePress.ts`      | Reusable hook for press scale animation with spring config |
| `useFadeIn.ts`          | Fade + slide entrance animation hook                       |
| `useCountUp.ts`         | Animated number counting hook                              |
| `AnimatedPressable.tsx` | Pressable wrapper with built-in scale feedback             |
| `springConfig.ts`       | Shared spring configurations (snappy, bouncy, gentle)      |

#### Implementation Notes

- Use `withSpring()` for natural, physics-based feel
- Use `withTiming()` + easing for precise control (e.g., checkmark draw)
- Respect `reduceMotion` accessibility setting via `useReducedMotion()`
- Keep animations under 300ms for responsiveness
- Use `runOnJS()` for callbacks to avoid UI thread blocking

### New Hooks (`src/hooks/`)

| Hook                 | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `useHabits.ts`       | Platform-agnostic: SQLite on native, React Query on web |
| `useTodayEntries.ts` | Fetch today's entries for all habits                    |
| `useQuickLog.ts`     | Toggle entry for habit on current date                  |
| `useUserName.ts`     | Get user's name from Supabase profile or local storage  |

### Data + Sync Updates (Phase 1)

- Ensure SQLite schema + Supabase schema stay aligned for any new habit fields.
- Update sync payloads (push/pull) to include new habit properties and defaults.
- Add a backfill/migration step for existing habits.

### Acceptance Criteria (Phase 1)

- Habit list renders with quick-log on native and web.
- Quick-log updates streak and today's entry count in UI without a full refresh.
- Empty state renders and CTA navigates to create habit.

### Personalized Greeting

Use the user's name (from `getLocalName()` or Supabase profile) to personalize the home screen:

- **Header**: "Good morning, {{name}}" or "Your habits" if no name
- **Empty state**: "{{name}}, create your first habit!" or generic CTA

Name sources (in priority order):

1. Supabase `user_metadata.full_name` (authenticated users)
2. Local name from `src/auth/nameStorage.ts` (unauthenticated or pre-auth)
3. Fallback to generic greeting

### Files to Modify

- [app/(tabs)/index.tsx](<app/(tabs)/index.tsx>) - **Complete rewrite**: Replace generic welcome with habit list + personalized greeting
- [src/i18n/locales/en.json](src/i18n/locales/en.json) - Replace `home.*` keys + add `habits.*` keys with name interpolation
- [src/i18n/locales/es.json](src/i18n/locales/es.json) - Spanish translations

### New Home Screen Structure

```
┌────────────────────────────┐
│  Good morning, Sarah       │  ← Personalized greeting
│  January 20, 2026          │  ← Current date
├────────────────────────────┤
│  ┌──────────────────────┐  │
│  │ 🏃 Exercise    ✓ 5   │  │  ← HabitCard with quick-log
│  │ 12 day streak        │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 📖 Read       ○ 0    │  │  ← Not completed yet
│  │ 0 day streak         │  │
│  └──────────────────────┘  │
│                            │
│        [+ FAB]             │  ← Floating action button
└────────────────────────────┘
```

---

## Phase 2: Create/Edit Habit Flow

**Goal**: Modal screens for creating and editing habits.

### New Routes

| Route                          | File                             | Purpose |
| ------------------------------ | -------------------------------- | ------- |
| `/(tabs)/habit/_layout.tsx`    | Stack navigator for habit routes |
| `/(tabs)/habit/new.tsx`        | Create habit form                |
| `/(tabs)/habit/[id]/index.tsx` | Habit detail view                |
| `/(tabs)/habit/[id]/edit.tsx`  | Edit habit form                  |

### New Components

| Component             | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `HabitForm.tsx`       | Shared form for create/edit (name, cadence, color, goal) |
| `ColorPicker.tsx`     | Grid of 12 preset colors                                 |
| `CadenceSelector.tsx` | Daily / Weekly / Custom day selection                    |
| `GoalInput.tsx`       | "X times per day/week" number input                      |

### Schema Migration Required

Current schema has: `name`, `cadence`, `color`, `sortOrder`, `isArchived`

**New fields to add**:

- `icon` (string, nullable) - Lucide icon name (e.g., "heart", "dumbbell", "book")
- `targetAmount` (integer, default 1) - Goal count per period (e.g., "3 times per day")
- `description` (string, nullable) - Optional habit description

**Migration file**: `src/db/sqlite/migrations/add_habit_fields.ts`

### Reminders Integration (Phase 2)

- Add optional reminder settings per habit (time, cadence, enabled).
- On create/update: schedule or reschedule reminders.
- On disable/delete: cancel reminders and clear stored IDs.

### Web Data Strategy (Phase 2)

- Define web data source (Supabase queries).
- Ensure RLS policies allow per-user habit CRUD.
- Resolve conflict strategy (last write wins or server timestamp).

### Acceptance Criteria (Phase 2)

- Create habit (native + web) persists and appears in list.
- Edit habit updates list and detail view immediately.
- Reminder changes schedule/cancel as expected.

---

## Phase 3: Habit Detail & Analytics

**Goal**: Rich detail view with stats, streak, and calendar visualization.

### Habit Detail Screen Sections

1. **Header**: Name, color badge, streak count, edit button
2. **Today Card**: Quick-log with current count display
3. **Stats Row**: Current streak | Longest streak | Completion rate
4. **Calendar Heatmap**: GitHub-style grid (existing component)
5. **Recent History**: List of recent entries with dates

### New Utilities (`src/utils/`)

| Utility      | Purpose                                                        |
| ------------ | -------------------------------------------------------------- |
| `streak.ts`  | `calculateCurrentStreak()`, `calculateLongestStreak()`         |
| `stats.ts`   | `getCompletionRate()`, `getWeeklyStats()`, `getMonthlyStats()` |
| `heatmap.ts` | Transform entries into CalendarHeatmap format                  |

### Acceptance Criteria (Phase 3)

- Streak, longest streak, completion rate computed correctly.
- Heatmap renders last 90 days with correct completion markers.
- Detail view updates after quick-log without reopening screen.

### Testing Plan (Phase 3)

- Unit tests for streak/stats/heatmap utilities.
- Integration test for quick-log -> UI update flow.

### Existing Components to Use

- `CalendarHeatmap` - Already exists
- `StatCard` - Already exists
- `StreakChart` - Already exists

---

## Phase 4: Reminders

**Goal**: Per-habit notification scheduling.

### UI Integration

- Add `ReminderSettings` section to habit detail/edit screens
- Use existing reminder infrastructure in `src/notifications/`

### New Components

| Component               | Purpose                             |
| ----------------------- | ----------------------------------- |
| `ReminderSettings.tsx`  | Toggle + time picker + day selector |
| `TimePicker.tsx`        | Native time picker wrapper          |
| `DayOfWeekSelector.tsx` | 7 toggle buttons (S M T W T F S)    |

### Data Flow

1. User enables reminder → Create reminder via `localReminders.ts`
2. Schedule notification via `scheduleReminderSeries()`
3. Store notification IDs for cancellation
4. On habit delete → Cancel associated reminders

---

## Phase 5: Archive, Delete & Reorder

**Goal**: Habit lifecycle management.

### Archive

- Use existing `isArchived` field
- Add toggle in Settings or habit list header: "Show archived"
- Archived habits: muted appearance, no quick-log

### Delete

- Soft delete using existing `deletedAt`
- Confirmation dialog before delete
- Cascade: delete associated entries + reminders

### Reorder

- Use existing `sortOrder` field
- **Approach**: Simple "Move up/down" buttons in edit mode (ship fast, upgrade to drag-drop later if needed)
- Add reorder controls to habit list when in "edit mode"

### New Component

- `ConfirmDialog.tsx` - Reusable confirmation modal

---

## Phase 6: Web Landing Page

**Goal**: Full marketing page replacing minimal landing.

### New Route Structure (Web-only rendering)

| Route      | File              | Purpose                                |
| ---------- | ----------------- | -------------------------------------- |
| `/`        | `app/index.tsx`   | Landing page (web) / redirect (native) |
| `/privacy` | `app/privacy.tsx` | Privacy Policy                         |
| `/terms`   | `app/terms.tsx`   | Terms of Service                       |
| `/support` | `app/support.tsx` | Contact/Support page                   |

### Landing Page Sections

1. **Hero**: Headline, subheadline, placeholder app mockup, download CTAs (App Store / Play Store badges)
2. **Features**: 4 key features with Lucide icons (Streaks, Reminders, Analytics, Sync)
3. **How It Works**: 3-step visual guide with placeholder illustrations
4. **Testimonials**: Placeholder quotes (editable later)
5. **Pricing**: "Free" badge with "Pro coming soon" teaser
6. **Footer**: Legal links (Privacy, Terms, Support), social placeholders, copyright

### Legal Page Templates

- **Privacy Policy**: GDPR/CCPA-compliant template covering data collection, storage, third-party services
- **Terms of Service**: Standard app usage terms, limitation of liability, account termination
- **Support Page**: Contact form placeholder, FAQ section, email link

### New Components (`src/ui/web/`)

| Component                 | Purpose                |
| ------------------------- | ---------------------- |
| `LandingHero.tsx`         | Hero section with CTAs |
| `FeatureGrid.tsx`         | Feature cards grid     |
| `HowItWorks.tsx`          | Step-by-step visual    |
| `TestimonialsSection.tsx` | Quote carousel/grid    |
| `PricingSection.tsx`      | Tier cards             |
| `LandingFooter.tsx`       | Footer with links      |

### In-App Legal Links

- Add to Settings: "Privacy Policy", "Terms of Service", "Contact Support"
- Opens WebView on native, links on web

### Web Landing Animations (CSS/Tamagui)

| Animation                | Section         | Description                                            |
| ------------------------ | --------------- | ------------------------------------------------------ |
| **Hero fade-in**         | `LandingHero`   | Staggered fade + slide up for headline, subhead, CTAs  |
| **App mockup float**     | `LandingHero`   | Subtle up/down floating animation on app preview image |
| **Feature cards**        | `FeatureGrid`   | Fade-in on scroll (intersection observer)              |
| **How it works steps**   | `HowItWorks`    | Sequential reveal as user scrolls                      |
| **Testimonial carousel** | `Testimonials`  | Auto-rotate with fade transition                       |
| **Button hover**         | All CTAs        | Scale (1.02) + shadow lift on hover                    |
| **Footer links**         | `LandingFooter` | Underline slide-in on hover                            |

---

## Phase 7: Feature Tier Structure (Monetization Prep)

**Goal**: Structure code for future paywall without implementing payments.

### Free Tier

- Unlimited habits
- Basic reminders
- Streak tracking
- Calendar heatmap
- Multi-device sync

### Premium Tier (Future - Structured Now)

- CSV/JSON export
- Advanced analytics (trends, insights)
- Custom icons per habit
- Widgets (iOS/Android)
- Extended history (>2 years)
- Priority support

### Implementation Pattern

```typescript
// src/config/features.ts
export const FEATURES = {
  UNLIMITED_HABITS: { tier: 'free', enabled: true },
  BASIC_REMINDERS: { tier: 'free', enabled: true },
  STREAK_TRACKING: { tier: 'free', enabled: true },
  CALENDAR_HEATMAP: { tier: 'free', enabled: true },
  MULTI_DEVICE_SYNC: { tier: 'free', enabled: true },
  DATA_EXPORT: { tier: 'premium', enabled: false }, // Premium feature
  ADVANCED_ANALYTICS: { tier: 'premium', enabled: false },
  CUSTOM_ICONS: { tier: 'premium', enabled: false },
  WIDGETS: { tier: 'premium', enabled: false },
} as const;

export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature].enabled; // Always true for now
}
```

---

## Implementation Order

### Week 1: Core Loop

| Day | Tasks                                                  |
| --- | ------------------------------------------------------ |
| 1   | Create HabitCard, HabitList, QuickLogButton components |
| 2   | Build useHabits, useTodayEntries, useQuickLog hooks    |
| 3   | Transform home screen with habit list + empty state    |
| 4   | Build HabitForm, ColorPicker, CadenceSelector          |
| 5   | Implement create habit flow (/(tabs)/habit/new)        |

### Week 2: Detail & Polish

| Day | Tasks                                                    |
| --- | -------------------------------------------------------- |
| 1   | Build habit detail screen with stats                     |
| 2   | Implement streak/stats utilities, wire to UI             |
| 3   | Add edit habit flow, archive/delete functionality        |
| 4   | Build reminder settings UI, integrate with notifications |
| 5   | Polish, testing, bug fixes                               |

### Week 3: Web & Monetization Prep

| Day | Tasks                                          |
| --- | ---------------------------------------------- |
| 1-2 | Build web landing page sections                |
| 3   | Create Privacy, Terms, Support pages           |
| 4   | Add feature flag structure, in-app legal links |
| 5   | Final polish, testing                          |

---

## Future Enhancements (Post-MVP / Premium)

### Data Export (Premium)

- Export habits and entries to CSV/JSON
- Use `expo-sharing` to share files
- Add "Export Data" section to Settings
- Gated behind premium tier

### Additional Premium Features

- Advanced analytics (trends, insights, charts)
- Custom icons per habit
- Home screen widgets (iOS/Android)
- Extended history beyond 2 years

---

## Testing Strategy

### Unit Tests

- `src/utils/streak.ts` - Streak calculation edge cases
- `src/utils/stats.ts` - Stats computation
- `src/utils/export.ts` - Export format correctness

### Component Tests

- Use `testID` props consistently
- Test: empty state, loading, error, populated states
- Test: form validation, submission

### E2E Tests (Maestro)

Add to `.maestro/flows/`:

- `create-habit.yaml` - Create new habit end-to-end
- `quick-log.yaml` - Complete a habit
- `view-habit-detail.yaml` - View stats and history

---

## Critical Files Reference

| File                                                                           | Purpose                  |
| ------------------------------------------------------------------------------ | ------------------------ |
| [app/(tabs)/index.tsx](<app/(tabs)/index.tsx>)                                 | Home screen to transform |
| [src/data/localPrimaryEntities.ts](src/data/localPrimaryEntities.ts)           | Habit CRUD operations    |
| [src/data/localEntries.ts](src/data/localEntries.ts)                           | Entry CRUD operations    |
| [src/db/sqlite/schema.ts](src/db/sqlite/schema.ts)                             | Database schema          |
| [src/ui/components/CalendarHeatmap.tsx](src/ui/components/CalendarHeatmap.tsx) | Heatmap pattern          |
| [src/ui/components/StatCard.tsx](src/ui/components/StatCard.tsx)               | Stats display pattern    |
| [app/(tabs)/settings/index.tsx](<app/(tabs)/settings/index.tsx>)               | Complex screen pattern   |
| [tamagui.config.ts](tamagui.config.ts)                                         | Theme tokens             |

---

## Decisions Made

| Decision         | Choice                                                          |
| ---------------- | --------------------------------------------------------------- |
| Schema additions | Add `icon`, `targetAmount`, `description` fields now            |
| Reorder UX       | Up/Down buttons (simple, ship fast)                             |
| Icon set         | Lucide icons (already in project)                               |
| Landing assets   | Placeholder images/illustrations                                |
| Legal content    | Placeholder templates (customize later)                         |
| Animations       | react-native-reanimated for native, CSS/Tamagui for web landing |

---

## Verification Plan

### After Each Phase

1. Run `npm test` - All tests pass
2. Run `npm run type-check` - No TypeScript errors
3. Run `npm run lint` - No linting errors
4. Manual test on iOS simulator + web

### Final Verification

1. Create habit → appears in list
2. Quick-log → entry created, streak updates
3. View detail → stats are accurate
4. Set reminder → notification fires
5. Web landing → all sections render, links work
6. Legal pages → accessible from web and in-app
