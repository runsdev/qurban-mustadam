# Design System Specification: The Ethereal Legacy

## 1. Overview & Creative North Star

**Creative North Star: "The Sacred Archive"**
This design system moves away from the transactional nature of typical tracking apps and instead adopts the persona of a "High-End Digital Curator." The objective is to make the act of Qurban (sacrifice and charity) feel like a sacred, premium experience rather than a logistics task.

To break the "template" look, this system utilizes **Intentional Asymmetry**. Large editorial headlines (`display-lg`) should be offset against expansive white space, and decorative geometric patterns should bleed off the edges of the screen. We embrace "The Breath of the Page"—using generous padding and negative space to convey a sense of peace, focus, and transparency.

---

## 2. Colors & Tonal Depth

The palette is rooted in the earth (Sand) and the divine (Emerald), accented by the light of Gold.

### The "No-Line" Rule

**Prohibit 1px solid borders for sectioning.** Boundaries must be defined through background color shifts. To separate a tracking module from the main dashboard, place a `surface-container-low` section on a `surface` background. The transition should be felt, not seen as a line.

### Surface Hierarchy & Nesting

Treat the UI as physical layers of fine vellum.

- **Base:** `surface` (#fbf9f5) — The foundational "paper."
- **Secondary Sections:** `surface-container-low` (#f5f3ef).
- **Primary Interaction Cards:** `surface-container-lowest` (#ffffff) to provide a "pop" of clean white against the sand.
- **Nesting:** When a details panel is inside a card, move from `surface-container-lowest` back to `surface-container` to create a "recessed" effect.

### The "Glass & Gold" Rule

For floating navigation or high-importance modals, use **Glassmorphism**. Use the `surface` color at 70% opacity with a `24px` backdrop-blur.

- **Signature Textures:** Apply a subtle linear gradient to main CTAs (`primary` #003527 to `primary_container` #064e3b) at a 135-degree angle. This adds a "silk" sheen to the deep emerald.

---

## 3. Typography

The typography strategy pairs the timeless authority of a Serif with the modern clarity of a Geometric Sans.

- **Display & Headlines (Noto Serif):** Used for storytelling and page titles. This conveys tradition and the "Sacred" aspect. High-contrast sizing (e.g., using `display-lg` for status updates) creates an editorial, high-end feel.
- **Body & Labels (Plus Jakarta Sans):** A modern, high-legibility sans-serif used for data, tracking numbers, and interactive elements. It provides the "Minimalist" balance to the ornate Serif.
- **Hierarchy Note:** Always maintain a minimum 2x size ratio between headlines and body text to ensure a signature "Editorial" look.

---

## 4. Elevation & Depth

We eschew the "Material" drop-shadow in favor of **Tonal Layering**.

- **The Layering Principle:** Softness is achieved by stacking. A `surface-container-highest` element placed on a `surface` background creates enough contrast that shadows are unnecessary.
- **Ambient Shadows:** If a floating element (like a mobile nav) requires lift, use: `box-shadow: 0 12px 32px rgba(55, 45, 23, 0.06);`. The shadow is a tinted `tertiary` (warm earth) rather than grey, making it feel like natural sunlight.
- **The "Ghost Border":** For input fields or cards on mobile where contrast is tight, use `outline-variant` (#bfc9c3) at **15% opacity**. It should be a whisper of a line, not a boundary.

---

## 5. Components

### Buttons

- **Primary:** Emerald gradient (`primary` to `primary_container`) with `on_primary` text. `xl` (1.5rem) rounded corners. No border.
- **Secondary (The Gold Accent):** `secondary_container` (#fed65b) background with `on_secondary_container` (#745c00) text. Use for "Add Qurban" or "Donate."
- **Tertiary:** Ghost style. Transparent background, `primary` text, with a `surface-container-high` hover state.

### Cards & Progress Tracking

- **Rule:** Forbid divider lines.
- **Implementation:** To separate tracking stages (e.g., "Sourcing," "Slaughtered," "Distributed"), use a vertical `surface-container-low` track with a `secondary` (Gold) indicator.
- **Geometric Accents:** Every card should feature a 5% opacity "Arabesque" geometric pattern in the top right corner using the `primary` color token.

### Input Fields

- **Style:** Minimalist underline or soft-filled.
- **State:** Default state is `surface-container-low`. On focus, transition to `surface-container-lowest` with a 1px `secondary` (Gold) bottom border only.

### Contextual Components for Qurban

- **The "Certificate" Card:** A high-end summary card using `primary_fixed` (#b0f0d6) background and `notoSerif` typography to present the final completion certificate to the user.
- **Live Status Chip:** Using `primary` background with a soft "pulsing" animation using `surface_tint`.

---

## 6. Do’s and Don’ts

### Do:

- **Do** use `xl` (1.5rem) rounding for large containers to maintain the "soft, premium" promise.
- **Do** use asymmetrical layouts. Place the "Qurban Progress" counter off-center to create visual interest.
- **Do** treat images of livestock or distribution with a desaturated, warm filter to match the "Sand" palette.

### Don’t:

- **Don’t** use pure black (#000000) for text. Use `on_surface` (#1b1c1a) to keep the contrast soft and readable.
- **Don’t** use harsh 1px borders. If you feel you need a line, use a 12px `spacing` gap instead.
- **Don’t** crowd the screen. If a page feels full, remove an element or increase the `surface` padding.
