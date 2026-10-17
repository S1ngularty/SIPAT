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

The design is modern, nature-inspired, minimal, and photography-led. It uses dark forest greens, olive greens, lime-green accents, pale sage surfaces, white text, rounded cards, and restrained transparency.

### Core design principles

- Agricultural photography is a major visual element, not merely decoration.
- Use dark green surfaces to establish hierarchy and support white text.
- Use lime green sparingly for primary actions and selected states.
- Use pale green-tinted backgrounds for dashboard content.
- Use rounded corners consistently without making every element look like a pill.
- Prefer subtle layering and transparency over heavy shadows and borders.
- Maintain readable text contrast over images.
- Keep spacing, typography, corner radii, and icon sizes consistent.
- Do not reproduce the white phone frames, mockup shadows, or beige canvas around the three devices; those belong to the presentation image, not the app UI.

### Approximate color palette

These are visual estimates from the reference, not extracted design tokens.

| Token | Approximate hex | Intended use |
|---|---|---|
| Forest green | `#18351D` | Dark backgrounds, navigation, bottom image overlays |
| Deep olive green | `#30491B` | Weather cards, translucent panels, field overlays |
| Secondary agricultural green | `#52782B` | Secondary surfaces, subtle accents |
| Lime green | `#86C653` | Primary buttons, selected filters, active navigation |
| Pale sage | `#EFF3E9` | Dashboard background and light surfaces |
| White | `#FFFFFF` | Text on dark backgrounds and card surfaces |
| Muted gray-green | `#687067` | Secondary text on light surfaces |

If the project already has a theme, adapt these values to it rather than introducing a competing design system.

### Typography

Use the project's existing sans-serif font if it is suitable. A consistent font such as Inter can be considered if the project already supports custom fonts; do not add a font dependency unnecessarily.

| Element | Suggested starting size | Weight |
|---|---:|---|
| Onboarding headline | 28–32 px | Bold |
| Screen title | 19–22 px | Semibold/bold |
| Weather temperature, if present | 42–50 px | Regular |
| Section heading | 19–21 px | Bold |
| Card title | 14–16 px | Semibold |
| Main body text | 13–15 px | Regular |
| Secondary labels | 11–13 px | Regular |
| Bottom navigation label | 10–12 px | Regular |

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

1. Greeting and notification row.
2. Weather summary card.
3. “My Fields” section header and “See All” action.
4. Horizontal category filters.
5. Horizontally scrolling content cards.
6. Persistent bottom navigation.

### A. Greeting and notification row

- Place a circular avatar at the left, approximately 40–44 px in diameter.
- Put a compact two-line greeting beside the avatar.
- Use a smaller, lower-emphasis first line and a more prominent second line.
- Place a notification icon inside a circular dark-green control at the right.
- Vertically center all elements and leave sufficient space before the weather card.
- Use the authenticated user's name and avatar where available.
- Provide a reasonable fallback when profile data is missing.

### B. Weather summary card

The weather card is the largest summary component on the dashboard.

**Visual structure**
- Dark forest/olive green background; a restrained gradient is optional.
- Approximately 24 px corner radius.
- Approximately 14–18 px internal padding.
- Location row near the top.
- Weather icon toward the right.
- Large temperature as the dominant value.
- Condition and update timestamp near the temperature.
- Thin divider between the primary weather display and the secondary metrics.
- Three compact metric columns at the bottom.

**Possible data fields shown in the reference**
- Location
- Temperature
- Weather condition
- Humidity
- Precipitation
- Wind speed

The temperature should be significantly larger than all other text in the card. Secondary metrics should use small labels and clearly readable values.

**Data integrity**
- Do not hardcode sample weather readings as if they were current.
- Use actual data from the project's configured source.
- Show a skeleton/loading state while loading.
- Provide an explicit unavailable or error state when data cannot be retrieved.
- Do not invent a location or claim that the displayed weather is live unless the data source supports it.

### C. “My Fields” section header

- Place the section title on the left.
- Place a compact “See All” action on the right.
- Keep both on one row.
- Use a bold title and a smaller, lower-emphasis action.
- Maintain approximately 18–24 px separation from the preceding card, while keeping the header close to its filters.

### D. Horizontal category filters

The reference uses a horizontal row of rounded chips. The active chip is lime green; inactive chips are white or light neutral.

Requirements:
- Keep chip heights consistent.
- Use sufficient horizontal padding.
- Add small horizontal gaps.
- Make the selected state visually obvious.
- Keep the list on one horizontal line; allow scrolling rather than wrapping.
- Ensure selecting a chip actually filters or updates the displayed content.
- Provide accessible labels and a selected-state indication that is not based on color alone.

The categories visible in the reference are illustrative. Use categories relevant to the real application.

### E. Horizontal content cards

The cards use a white surface with rounded corners and a large image. The next card is partly visible, suggesting horizontal scrolling.

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

The reference shows a dark-green, floating-looking pill near the bottom, with four smaller destinations and a larger central add action.

Example destinations in the reference:
- Home
- Fields
- Add
- Document
- Profile

Visual requirements:
- Dark-green rounded outer container.
- Evenly distributed navigation items.
- Compact outline icons and small labels.
- Lime-green active state.
- A larger lime-green circular center action.
- Adequate contrast between active and inactive destinations.

Behavior requirements:
- Each destination must navigate to the appropriate existing route.
- The central add control must execute a real creation action or open the appropriate flow.
- Do not create duplicate or disconnected navigation logic if React Navigation is already configured.
- Position the bar with safe-area awareness.
- Prevent it from covering scrollable content.
- Account for the system gesture indicator and smaller devices.

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
- Use a translucent olive-green background.
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
│   │   ├── WeatherSummaryCard.tsx
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

### Component responsibilities

| Component | Responsibility |
|---|---|
| `ScreenContainer` | Shared background, safe-area handling, layout conventions |
| `PrimaryPillButton` | Reusable pill action with icon and label |
| `CircularIconButton` | Back, notification, bookmark, and other compact actions |
| `WeatherSummaryCard` | Weather presentation and loading/error states |
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

## Final acceptance criteria

The implementation is acceptable when it captures the reference's agricultural visual identity—forest-green surfaces, lime-green actions, pale sage backgrounds, rounded cards, photography, restrained overlays, and clear information hierarchy—while fitting the existing React Native application, adapting to different devices, using truthful data, and keeping all interactive controls functional.