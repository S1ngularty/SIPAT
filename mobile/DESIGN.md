# Agricultural Mobile UI Reference Guide
## Detailed design and implementation specification for a React Native coding agent

## 1. Objective

Use the supplied reference image as a visual guide for an agricultural mobile application. The composite image contains three mobile screens:

1. **Onboarding / welcome screen** — full-screen agricultural photography, a bold headline, supporting text, and a primary call-to-action.
2. **Home dashboard** — a greeting and notification row, weather summary card, category filters, horizontally scrolling content cards, and bottom navigation.
3. **Field detail / monitoring screen** — full-screen aerial field imagery, a compact header, a translucent field summary panel, image annotations, and a two-column metrics panel.

The image is a visual reference, not a specification of the application's actual data or features. Reproduce its visual language and layout principles while respecting the existing application's requirements, navigation, architecture, and available data.

---

## 2. Overall visual direction

The design is modern, nature-inspired, minimal, and photography-led.

> **Note:** §11 documents the UI style actually implemented in the SIPAT app.
> Where the reference recreated below differs, §11 is the source of truth.

### Core design principles

- Agricultural photography is a major visual element, not merely decoration.
- **White base.** Screens sit on white; there are no tinted page backgrounds.
- **Dark neutral surfaces** (charcoal) establish hierarchy and carry white text.
- **Green is an accent**, not a fill. Reserve it for primary actions, active
  states and status; never paint large areas green.
- **Slim, visible outlines.** Separate surfaces with a 1 px hairline rather
  than fills or heavy shadows.
- Use rounded corners consistently without making every element look like a pill.
- Maintain readable text contrast over images.
- Keep spacing, typography, corner radii, and icon sizes consistent.
- Do not reproduce the white phone frames, mockup shadows, or beige canvas around the three devices; those belong to the presentation image, not the app UI.

### Approximate color palette

These are the tokens implemented in `src/theme/colors.ts` (§11).

| Token | Hex | Intended use |
|---|---|---|
| `forest` | `#18351D` | Text/icons on lime actions |
| `green` | `#52782B` | Accents: chip outlines/labels, quiet highlights |
| `lime` | `#86C653` | Primary actions, selected states |
| `charcoal` | `#22282A` | Bottom navigation, dark panels, active chips |
| `capsuleOnDark` | `rgba(255,255,255,.12)` | White-opacity capsule/button on the dark bar |
| `outlineOnDark` | `rgba(255,255,255,.26)` | Slim hairline over photography |
| `backdrop` | `rgba(34,40,42,.45)` | Scrim behind modals/sheets |
| `white` | `#FFFFFF` | Screen and card surfaces |
| `surfaceMuted` | `#F3F4F6` | Thumbnails, empty-state circles, image placeholders |
| `skeleton` | `#D9D9D9` | Loading skeleton shimmer base |
| `borderStrong` | `#D1D6D0` | Slim outline for cards and controls |
| `text` | `#1D1D1B` | Primary text on light surfaces |
| `textMuted` | `#6B7280` | Secondary text on light surfaces |
| `textOnDark` | `#FFFFFF` | Text and icons on dark surfaces |
| `success` / `warning` / `danger` | `#3F7D50` / `#C08A2E` / `#B4433A` | Status only |

If the project already has a theme, adapt these values to it rather than introducing a competing design system.

### Typography

Use the project's existing sans-serif font if it is suitable. A consistent font such as Inter can be considered if the project already supports custom fonts; do not add a font dependency unnecessarily.

| Element | Suggested starting size | Weight |
|---|---|---|
| Onboarding headline | 28–32 px | Bold |
| Screen title | 19–22 px | Semibold/bold |
| Section heading | 19–21 px | Bold |
| Card title | 14–16 px | Semibold |
| Main body text | 13–15 px | Regular |
| Secondary labels | 11–13 px | Regular |
| Bottom navigation | Icon only — no visible labels (§11) |

Use a clear type hierarchy. Avoid making every label bold, overly thin fonts on photographs, and long uppercase paragraphs. Adjust sizes for device width, localization, and accessibility font scaling.

### Spacing and shape

| Property | Suggested starting value |
|---|---:|
| Main horizontal padding | 16–20 px |
| Section spacing | 20–24 px |
| Card internal padding | 12–16 px |
| Label-to-value spacing | 4–8 px |
| Standard primary button height | 46–52 px |
| Compact icon control | 40–48 px |
| Large card radius | 16–24 px |
| Pill radius | Fully rounded |

Treat these as consistent tokens, not hardcoded requirements for every element. Use the project's existing spacing and radius conventions if they already exist.

---

## 3. Screen 1 — Onboarding / welcome

### Purpose

Introduce the application through one strong agricultural image, one concise value proposition, a supporting sentence, and a single primary action. The screen should feel immersive rather than like a dashboard or form.

### Layout

1. **Full-screen background image**
   - Fill the available screen with an agricultural photograph.
   - Use cover scaling without stretching or distorting the image.
   - Choose an image whose important subject remains visible after cropping.
   - Add a subtle dark overlay, with stronger darkening toward the bottom.
   - Keep text readable over bright vegetation, soil, or sky.

2. **Bottom content group**
   - Position the headline, description, and button together near the bottom.
   - Use approximately 20–24 px horizontal padding.
   - Respect top and bottom system safe areas.
   - Do not position the content so low that it collides with the home indicator or system navigation.

3. **Headline**
   - Use a short, two-line headline aligned left.
   - Style it in white, uppercase, bold text at approximately 28–32 px.
   - Keep line spacing relatively tight.
   - Use product-accurate wording; do not promise capabilities the application does not provide.

4. **Supporting description**
   - Place it roughly 8–12 px below the headline.
   - Use white text at approximately 13–14 px.
   - Keep the line length controlled so it wraps naturally.

5. **Primary call-to-action**
   - Use a wide lime-green pill-shaped button, approximately 50–54 px tall.
   - Include a dark-green circular arrow control on the left.
   - Center the action label visually.
   - A subtle forward-chevron decoration can appear at the right.
   - Make the entire button one interactive target; the arrow is not a separate action unless the product explicitly requires it.

### Interaction and behavior

- The primary action navigates to the correct next screen in the existing app flow.
- Provide restrained press feedback, such as a slight opacity change.
- Do not add a dashboard header or bottom navigation to this screen unless the existing product flow requires one.
- Verify that the headline, description, and button remain visible on short and tall devices.

### React Native guidance

Use `ImageBackground` or an absolutely positioned `Image`, with a separate overlay view. If a gradient library is already installed, a subtle vertical gradient can darken the lower portion. Do not install a new dependency without checking the current project first.

---

## 4. Screen 2 — Home dashboard

### Purpose

Provide a quick overview and entry points to the application's main features. The reference combines a light background with a prominent dark-green weather card, category filters, horizontal cards, and a floating-looking bottom navigation bar.

### Page order

1. **Upper sheet** — profile, notifications and weather on one photographic panel.
2. “Recent Diagnoses” section header and “See All” action.
3. Horizontal category filters.
4. Horizontally scrolling diagnosis cards.
5. Persistent bottom navigation.

### A. Upper sheet (profile + notifications + weather)

A single static panel at the top of Home groups the three summary elements instead of stacking separate cards.

**Structure**
- One shared background photograph from `assets/images` (`resizeMode="cover"`), square top corners and rounded bottom corners.
- A vertical overlay gradient from green (`rgba(24,53,29,.72)`) to charcoal (`rgba(20,24,26,.90)`) so white text and hairlines stay readable on any part of the photo.
- Generous bottom padding (~32 px) so the panel reads as a sheet rather than a card.

**Profile row**
- Circular avatar (~44 px) inside a 1 px white-opacity ring, beside a two-line greeting: a smaller muted-white first line and a bolder white second line.
- Tapping the row opens the Profile destination.
- Use the authenticated user's name and avatar; fall back to initials.

**Notification control**
- A hairline-outlined circular control on the right — white icon, no fill.
- It must open a real destination (the activity/diagnosis list).

**Weather block**
- Below the profile row: a slim hairline block with **no fill**, pure white text and icons.
- Location row on top, large temperature and condition below, then a hairline-separated row of compact metrics.
- SIPAT has no weather provider yet, so `getWeatherState()` returns a documented temporary mock. Loading and unavailable states are already implemented — see §11.

### B. Weather data integrity

- Do not present sample readings as live measurements.
- Keep one wiring point for the provider: `src/features/home/weather.ts`.
- Show the skeleton/loading state while loading, and an explicit unavailable state when data cannot be retrieved.
- While the mock is in place, its values are placeholder content, not product data.

### C. “Recent Diagnoses” section header

- Place the section title on the left.
- Place a compact “See All” action on the right.
- Keep both on one row.
- Use a bold title and a smaller, lower-emphasis action.
- Maintain approximately 18–24 px separation from the preceding sheet, while keeping the header close to its filters.

### D. Horizontal category filters

The reference uses a horizontal row of rounded chips. SIPAT keeps every chip
**white with a thin outline**; the selected chip takes the green accent on its
outline and label only (§11).

Requirements:
- Keep chip heights consistent.
- Use sufficient horizontal padding.
- Add small horizontal gaps.
- Make the selected state visually obvious.
- Keep the list on one horizontal line; allow scrolling rather than wrapping.
- Ensure selecting a chip actually filters or updates the displayed content.
- Provide accessible labels and a selected-state indication that is not based on color alone (see §11: green outline + green label + check glyph).

The categories visible in the reference are illustrative. Use categories relevant to the real application — SIPAT uses date buckets (All / Today / Yesterday / This week / Older).

### E. Horizontal content cards

The cards use a white surface with a slim hairline outline, rounded corners and a large image. The next card is partly visible, suggesting horizontal scrolling.

Each card may contain:
1. A crop or agricultural photograph.
2. An optional bookmark/action icon over the image.
3. A bold title below the image.
4. A short supporting description, typically two or three lines.

Implementation details:
- Use a horizontal `FlatList` or an existing equivalent.
- Calculate card width from available screen width and horizontal padding.
- Let the next card peek into view where practical.
- Use a consistent image aspect ratio and corner treatment.
- Avoid stretching photographs.
- Clamp long titles/descriptions where appropriate.
- Implement card presses only when the card has a real destination or action.
- Provide placeholders or fallbacks for missing images.

Do not copy sample content such as pumpkin harvest unless it is relevant to the real product.

### F. Bottom navigation

The implemented bar (§11) is a dark, floating, **icon-only** stadium at the bottom of the screen.

Example destinations in the reference:
- Home
- Fields
- Add
- Document
- Profile

SIPAT destinations, in order: Home, Diagnoses, Scan, History, Profile.

Visual requirements:
- Dark **charcoal** outer container, fully rounded (`radii.pill`) so it is an actual oblong.
- Evenly distributed destinations; no visible labels — icon only.
- Compact **slim** outline icons (stroke ≈ 1.3, ≈ 1.9 when selected).
- White icons when unselected, **green** (`lime`) when selected.
- A white-opacity capsule (`capsuleOnDark`) that **slides** between destinations to mark the selected one, staying inside the bar.
- The center `Scan` destination is a plain white icon — it does not overflow the bar.

Behavior requirements:
- Each destination must navigate to the appropriate existing route.
- The center `Scan` control must execute a real action (it opens the recording flow) rather than switching to its own tab.
- Do not create duplicate or disconnected navigation logic if React Navigation is already configured.
- Position the bar with safe-area awareness.
- Prevent it from covering scrollable content (report the height via `BottomTabBarHeightCallbackContext`).
- Account for the system gesture indicator and smaller devices.
- Because there are no labels, every destination **must** keep a descriptive accessibility label.

---

## 5. Screen 3 — Field detail / monitoring

### Purpose

Present an individual field using immersive aerial imagery, a compact header, a field summary card, optional image annotations, and a two-column metrics panel.

This is closer to a map-like overview than a conventional settings screen.

### A. Full-screen field image

- Use an aerial agricultural photograph as the primary background.
- Fill the screen without stretching the image.
- Use cover scaling and check crop behavior on multiple aspect ratios.
- Add subtle darkening behind text and overlays as necessary.
- Keep the image visible around the cards so the screen remains immersive.
- Provide a deliberate fallback if the image is unavailable.

### B. Header

The top row contains:
- Back button at the left.
- Field title near the center.
- Circular profile/avatar control at the right.

Visual requirements:
- Use a small translucent dark-green circle for the back control.
- Use white title text.
- Keep the header horizontally balanced.
- Use a circular avatar.
- Respect the status bar and top safe-area inset.
- Connect the back button to the correct navigation behavior.

### C. Field summary panel

The reference contains three label/value rows, for example:
- Total area
- Plant age
- Yield

These are example fields, not mandatory data.

Visual requirements:
- Position the panel in the upper portion of the screen, below the header.
- Use a translucent dark (`charcoal`) background.
- Use rounded corners and consistent internal padding.
- Align labels to the left and values to the right.
- Separate rows with subtle horizontal dividers.
- Keep labels smaller than values.
- Preserve readable contrast over the background.

Use only data the application actually supports. For a crop-diagnosis product, appropriate alternatives might include crop type, last assessment date, or diagnosis status, provided those values exist in the data model. Do not invent field area, age, yield, or other measurements.

### D. Crop marker and field annotations

The reference shows a pill-shaped crop label over the image, plus dotted outlines and circular points.

If annotations are implemented:
- Use a compact translucent dark-green pill.
- Include a small crop symbol or relevant icon.
- Use short white text.
- Use dashed/dotted outlines sparingly.
- Keep annotation geometry aligned with the underlying image when it scales.
- Avoid arbitrary fixed pixel coordinates that work on only one device.

If annotations represent actual field geometry, store normalized or geographic coordinates and transform them correctly into the displayed map/image coordinate space. If no underlying geometry data exists, treat annotations as illustrative rather than factual boundaries.

### E. Bottom metrics panel

The reference uses a translucent dark-green panel near the bottom, with four metrics in a two-column, two-row grid.

Each metric cell contains:
- A short label.
- A small icon near the label.
- A larger value beneath the label.

The sample reference labels include water depth, plant health, soil quality, and pest risk. The shown percentages are illustrative and must not be represented as measured data unless the system genuinely measures them.

Layout requirements:
- Use equal-width columns.
- Align labels and values consistently.
- Give each row sufficient vertical spacing.
- Use subtle dividers only if needed.
- Keep the panel rounded and translucent.
- Leave enough of the background image visible.
- Position the panel above the bottom safe-area inset.

For the real product, display only supported diagnosis or crop-monitoring information. Do not claim the application measures water depth or soil quality unless those features and data sources exist.

---

## 6. Suggested component architecture

Inspect the existing project before creating or moving files. Reuse existing components, theme constants, and navigation patterns wherever possible.

One possible organization is:

```text
src/
├── screens/
│   ├── OnboardingScreen.tsx
│   ├── HomeScreen.tsx
│   └── FieldDetailScreen.tsx
├── components/
│   ├── buttons/
│   │   ├── PrimaryPillButton.tsx
│   │   └── CircularIconButton.tsx
│   ├── cards/
│   │   ├── WeatherBlock.tsx
│   │   ├── FieldCard.tsx
│   │   ├── FieldSummaryCard.tsx
│   │   └── MonitoringMetricsCard.tsx
│   ├── navigation/
│   │   └── BottomNavigation.tsx
│   ├── filters/
│   │   └── CategoryFilterList.tsx
│   └── common/
│       ├── ScreenContainer.tsx
│       └── ProfileAvatar.tsx
├── theme/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── radii.ts
└── navigation/
    └── AppNavigator.tsx
```

This is an example, not an instruction to restructure a working codebase unnecessarily.

SIPAT implements the subset it needs, under `src/features/home`:

```text
src/
├── features/home/
│   ├── screens/Home.tsx
│   ├── components/HomeHeroSheet.tsx     # upper sheet (profile + notifications + weather)
│   ├── components/GreetingHeader.tsx    # profile row (light/dark tone)
│   ├── components/WeatherBlock.tsx      # slim weather block
│   ├── components/DiagnosisCard.tsx     # horizontal diagnosis card
│   └── weather.ts                       # single weather wiring point
├── components/
│   ├── common/ProfileAvatar.tsx
│   └── ui/{CircularIconButton,CategoryFilterList,SkeletonComponent}.tsx
├── navigations/components/BottomTabBar.tsx
└── theme/{colors,spacing,radii,typography}.ts
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| `ScreenContainer` | Shared background, safe-area handling, layout conventions |
| `PrimaryPillButton` | Reusable pill action with icon and label |
| `CircularIconButton` | Back, notification, bookmark, and other compact actions |
| `WeatherBlock` | Weather presentation and loading/error states, placed inside the home hero sheet |
| `CategoryFilterList` | Horizontally scrollable category filters |
| `FieldCard` | Image, title, summary, and optional action |
| `FieldSummaryCard` | Label/value rows and separators |
| `MonitoringMetricsCard` | Two-column metrics layout |
| `BottomNavigation` | Persistent navigation and emphasized central action |

Keep presentation components focused on rendering. Put API requests and business logic in the existing service/state layers where practical. Pass data and callbacks through props. Follow the project's established architecture rather than imposing a new state-management pattern.

---

## 7. React Native implementation guidance

| Requirement | Suggested approach |
|---|---|
| Full-screen photograph | `ImageBackground` or absolutely positioned `Image` |
| Image darkening | Overlay `View`; use an existing gradient library if available |
| Rounded cards | `View` with `borderRadius`; use `overflow: "hidden"` where required |
| Horizontal category chips | Horizontal `FlatList` or `ScrollView` |
| Horizontal content cards | Horizontal `FlatList` |
| Metric grid | Two rows with two flexible columns |
| Circular profile image | `Image` with equal width/height and full border radius |
| Bottom navigation | Existing React Navigation setup or a custom component integrated with it |
| Loading state | Skeleton placeholders matching final component dimensions |
| Icons | Existing icon package already installed in the project |

Additional implementation requirements:
- Use `SafeAreaView` or the safe-area library already present in the project.
- Use flexible layouts rather than copying the mockup's device dimensions.
- Use `aspectRatio` for image tiles when it improves consistency.
- Ensure long content can scroll.
- Avoid unnecessary dependencies.
- Avoid duplicate navigation systems.
- Use `Pressable` or the project's existing interaction components for tappable controls.
- Ensure controls have appropriate accessibility labels and practical touch targets.
- Preserve text scaling where possible.
- Avoid unnecessary absolute positioning except for overlays, badges, and genuinely image-relative annotations.

### Transparency, shadows, and animation

- Prefer subtle translucent green surfaces over thick borders.
- Keep shadows soft and limited to elements that need separation.
- Use modest press feedback and restrained transitions.
- Avoid flashy gradients, continuously moving backgrounds, and distracting animation.
- Prioritize legibility and responsiveness over exact imitation of mockup effects.

---

## 8. Functional and accessibility requirements

The interface must work as a real application, not just resemble the image.

- Every visible button must perform its advertised action.
- Filters must update the displayed content.
- Interactive cards must open the correct detail view.
- Back controls must return to the appropriate previous screen.
- Notification and profile controls must have valid actions or destinations.
- Loading and error states must preserve layout stability.
- Missing images must use a deliberate fallback.
- Larger font settings must not cause critical text or buttons to disappear.
- Interactive elements should have accessible labels and appropriate touch targets.
- Selected states must not rely on color alone.
- Do not invent weather readings, field measurements, diagnosis results, or monitoring values.
- Keep the UI consistent with actual API responses and product capabilities.

---

## 9. Responsive behavior and quality checks

Do not derive actual React Native screen dimensions from the white device frames in the composite image. Those dimensions are part of the mockup presentation.

Test the implementation on:
- A narrow phone.
- A larger phone.
- Short and tall aspect ratios.
- Long localized text.
- Missing profile images.
- Missing agricultural images.
- Slow loading and failed requests.
- Empty lists.
- Larger accessibility font sizes.
- Devices with different status-bar and bottom-inset behavior.

Check specifically that:
- The onboarding call-to-action remains visible.
- The dashboard's horizontal cards can scroll.
- Category chips do not wrap onto unintended rows.
- The bottom navigation does not cover content.
- The field detail cards remain within the screen.
- Image annotations stay aligned when image dimensions change.
- Text remains legible over photographs.
- All buttons and navigation destinations work.

---

## 10. Agent workflow and deliverables

Follow this workflow:

1. Inspect the existing project and identify the relevant screens, routes, shared components, and design tokens.
2. Summarize which reference features fit the real product and which are only illustrative.
3. Implement the relevant screen(s) using the existing project conventions.
4. Extract repeated visual elements into reusable components where that improves maintainability.
5. Connect controls to real routes/actions and data sources where those exist.
6. Implement loading, error, empty, and missing-image states where relevant.
7. Run the available type checks, linting, and tests.
8. Fix regressions introduced by the changes.
9. Summarize files changed, implementation choices, any dependencies added, and checks performed.
10. Explicitly disclose anything that could not be verified or implemented.

### Non-negotiable constraints

- Do not blindly copy the sample weather, crop, yield, or monitoring values.
- Do not add unsupported product features just because they appear in the reference.
- Do not rewrite unrelated parts of the application.
- Do not duplicate existing navigation, theme, or API infrastructure.
- Do not use arbitrary fixed pixel positions for responsive layouts.
- Do not claim tests passed unless they were actually run.
- Prioritize maintainability, consistency, accessibility, and accurate application behavior.

---

## 11. Implemented SIPAT UI style (current app)

This section documents the style the app actually ships. Treat it as the source
of truth where it differs from the reference recreations above.

### 11.1 Foundations

| Aspect | Rule |
|---|---|
| Screen background | **White.** No tinted/dark page backgrounds. |
| Surfaces | White cards separated by a 1 px `borderStrong` hairline. |
| Dark surfaces | `charcoal` — bottom navigation, hero sheet fallback, active chips. |
| Green | Accent only: `lime` for primary actions and the selected tab (on charcoal), `green` for chip outlines/labels and quiet accents, `forest` for text on lime. |
| Muted fill | `surfaceMuted` for thumbnails, empty-state circles, image placeholders. |
| Text | `text` primary, `textMuted` secondary, `textOnDark` over photography/dark. |
| Radii | `sm 10 · md 14 · lg 20 · xl 24 · pill 999` (`src/theme/radii.ts`). Container bars use `pill`. |
| Spacing | `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32` (`src/theme/spacing.ts`). Screen padding is `xl` (20). |
| Icons | `lucide-react-native`, outline style. Slim strokes: ≈1.3 default, ≈1.9 for emphasis. |
| Gradients/overlays | Only over photography, to protect text contrast. |

### 11.2 Photography rule

Photography appears as a shared background with a dark overlay gradient, not as
decoration. Text and hairline outlines on top of it are always white. Where a
background image is required and no asset exists yet, the code keeps a single
`require(...)` constant so the asset can be swapped in one place
(`HomeHeroSheet.SHEET_BACKGROUND`).

### 11.3 Bottom navigation (`BottomTabBar`)

- Dark `charcoal` stadium (`radii.pill`), floating with a soft shadow, inset
  from the screen edges by `spacing.lg`.
- Five evenly distributed icon-only destinations: Home, Diagnoses, Scan,
  History, Profile. **No visible labels.**
- A single white-opacity capsule (`capsuleOnDark`) slides between destinations
  to mark the selected one (`withTiming`, 240 ms). It stays inside the bar.
- Unselected icons are white; the selected icon is `lime` and slightly heavier.
  Selection is signalled by capsule **and** colour **and** stroke weight — never
  colour alone.
- The center `Scan` icon is a plain white icon that opens the recording flow; it
  does not overflow the bar.
- The bar reports its height through `BottomTabBarHeightCallbackContext` so
  screens can pad scroll content. Every destination keeps an accessibility label
  because there are no visible labels.

### 11.4 Upper sheet (`HomeHeroSheet`)

Profile, notifications and weather share one static panel at the top of Home:
shared photo + green→charcoal overlay gradient, avatar row on top and the slim
weather block below. Details in §4.A.

### 11.5 Weather wiring

`src/features/home/weather.ts` is the only weather entry point. It currently
returns a **documented temporary mock** because no provider is configured.
`WeatherBlock` already renders loading, unavailable and ready states, so wiring a
real source requires changing only that file.

### 11.6 Diagnoses list (`DiagnosisListScreen`)

The Diagnoses tab follows the same foundations as Home.

- White screen. Header = 24 px/700 `text` title over a 13 px `textMuted` subtitle.
- **Filters reuse the shared `CategoryFilterList`**, so the chips are identical to
  Home: white with a thin outline, where the selected chip takes the green accent
  on its outline and label plus a check glyph.
- Rows are white cards at `spacing.xl` horizontal margin — aligned with the
  header and the chips — with `radii.md` and a 1 px `borderStrong` outline.
- Thumbnail: 42 px tile, `radii.sm`, `surfaceMuted`, slim `Video` icon.
- Status is not colour-only: a dot (`success` / `danger` / `textMuted`) plus a
  text label, and the confidence percentage uses the `green` accent.
- Swipe actions (rename / delete) and the long-press sheet are white surfaces
  with slim lucide icons (`Pencil` in `text`, `Trash2` in `danger`).
- Modals use the `backdrop` scrim; the primary modal button is the lime pill with
  `forest` text — the same primary action as Home.
- The empty state mirrors Home: a 60 px `surfaceMuted` circle with a `green`
  icon, `text` title, `textMuted` body, and a lime `Record Video` pill with a
  `ScanLine` icon.
- Icons are `lucide-react-native` at stroke 1.5, per §11.1.

### 11.7 Scanner (`VideoScanning`)

The camera screen is the one dark route (§11.1 status bar). It keeps the same
slim, outline-only language as the rest of the app.

- **Scan frame is minimalist and thin**: a 1 px `rgba(255,255,255,0.3)` hairline
  rounded box at `radii.xl` with four 26 px corner brackets at 2 px stroke —
  white idle, `lime` while recording (the box outline also shifts to a translucent
  lime). No thick borders, no fills, and the overlay is `pointerEvents="none"` so
  it never blocks the preview.
- **Controls are outline-only**: round `iconButton`s (close, mute) are transparent
  with a 1 px `rgba(255,255,255,0.45)` outline and `white` icons at stroke 1.5.
  The gallery button uses the same treatment. The record button is a 2 px `white`
  ring around a solid white dot, becoming a `lime` ring with a rounded `lime`
  square while recording.
- Accents are `colors.lime` (was the local `#4CAF50`) and `colors.danger` for the
  timer warning; spacing uses the `spacing`/`radii` scales.
- **Safe area**: the preview is deliberately full-bleed (`StyleSheet.absoluteFill`),
  so the screen uses a plain `View` rather than `SafeAreaView` and applies
  `useSafeAreaInsets()` directly to the absolutely positioned overlays —
  `paddingTop: insets.top + spacing.xl` on the top bar, `paddingBottom:
  insets.bottom + spacing.xxxl` on the bottom bar, and `top: insets.top + …` on the
  recording pill. `SafeAreaView` padding does **not** apply to absolute children,
  which is what previously pushed the controls under the status bar. The scrims
  still bleed behind the status bar / home indicator.
- **No camera-flip control** — the scanner is back-camera only (`facing="back"`),
  which is what plant capture needs. `useScanning` no longer tracks `cameraType`.
- **Focus**: `expo-camera` v57 exposes **no tap-to-focus API**. The only focus
  knob is the iOS-only `autofocus` mode prop; the screen sets `autofocus="off"`
  (continuous refocus as the plant moves — `"on"` would focus once and lock). The
  old `focusable` prop was not part of expo-camera and was silently falling through
  to React Native's generic `ViewProps`, so it has been removed. A tap-to-focus
  reticle would need a native module or a different camera library.

### 11.8 Known gaps / follow-ups

- **Weather is mocked** (`MOCK_WEATHER`) — replace before release.
- **No tap-to-focus** anywhere in the app — see §11.7.
- `DiagnosisDetailScreen`, `VideoPreview` and the auth screens still carry their
  own local grey palettes (e.g. `#6b7280`, `#e5e7eb`, `#16a34a`, `#4CAF50`)
  rather than the shared tokens. They are visually close (white base, neutral
  greys, green actions) but not tokenised.
- The reference's blue and white theme variants are **not** implemented; the app
  has a single theme.
- `assets/images/crop-placeholder.png` and the hero photo are placeholders the
  owner replaces with real assets.

## Final acceptance criteria

The implementation is acceptable when it captures the app's visual identity — a
white base, neutral dark-grey surfaces, slim visible outlines, green accents,
photography with restrained overlays, and a clear information hierarchy — while
fitting the existing React Native application, adapting to different devices,
using truthful data, and keeping all interactive controls functional.