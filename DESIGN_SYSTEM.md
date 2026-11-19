# POS Color System: Implementation Spec (v3, Lobster Red accent)

## Rules (follow strictly)
1. Use only the tokens below. Never hardcode any other hex value.
2. Proportion: cream 60% (surfaces), Prussian Blue 30% (brand, text, primary actions), Lobster Red 10% (accent).
3. Lobster Red (--accent) is a highlight only: the one hero CTA per screen, active-nav marker, notification dots, highlighted chart point, small decorative touches. Never use it for status, errors or body text.
4. Danger uses --danger (dark crimson), NOT --accent. Danger always has an icon (x or triangle) AND a text label.
5. Green means success only. Never use it for brand.
6. Never convey status with color alone. Always pair it with a text label or icon.
7. Max one red (--accent) button per screen.
8. Text on --accent must be white, bold, and at least 19px. For smaller text, use a blue or secondary button instead. Never put red text (--accent) on cream.

## Tokens
:root {
  /* Surfaces */
  --bg-app:        #EDE7D8;  /* cream */
  --bg-card:       #FAF7EF;
  --bg-muted:      #E2DBC8;
  --border:        #D3CBB4;

  /* Brand */
  --blue:          #2A4D77;  /* Refined Slate Blue (softer than deep midnight) */
  --blue-hover:    #213E61;
  --blue-press:    #19304D;
  --blue-tint:     #DCE5F0;

  /* Accent */
  --accent:        #F03A2A;  /* Lobster Red */
  --accent-hover:  #D92F1F;
  --accent-press:  #B82416;

  /* Text */
  --text-primary:   #1F3A5F;
  --text-secondary: #4A5F7F;
  --text-disabled:  #8A93A3;
  --text-on-blue:   #FFFFFF;
  --text-on-accent: #FFFFFF;
  --text-on-danger: #FFFFFF;

  /* Semantic */
  --danger:        #A61B1B;  /* dark crimson, white on it ~7:1 */
  --danger-tint:   #F3D9D6;
  --success:       #2E7D4F;
  --success-tint:  #D7EBDD;
  --warning:       #D9822B;
  --warning-tint:  #F8E3CC;
  --info-new:      #0F8B8D;  /* teal for "New" status */
  --info-new-tint: #D1EBEC;
}

## Backgrounds
- App/page: --bg-app
- Sidebar/top bar: --blue bg, white text; active item = 4px --accent left bar + --blue-hover bg
- Cards, modals, drawers: --bg-card, 1px --border, no heavy shadow
- Inputs: --bg-card bg, 1px --border; focus = 2px --blue ring; error = 2px --danger ring + error icon
- Table header: --bg-muted; row hover and selected row: --blue-tint

## Buttons
| Type | Bg | Text | Border | Use |
|---|---|---|---|---|
| Hero CTA (max 1/screen) | --accent | white, bold, 19px+ | none | "Send to Kitchen", "New Order" |
| Primary | --blue | white | none | Save, Confirm, Pay |
| Secondary | transparent | --blue | 1.5px --blue | Cancel dialog, Back, Edit |
| Ghost | transparent | --blue | none | Inline actions, filters |
| Destructive (default) | transparent | --danger | 1.5px --danger | Delete, Reject, Cancel Order (with icon) |
| Destructive (confirm dialog only) | --danger | white | none | Final "Yes, delete" |
| Disabled | --bg-muted | --text-disabled | none | Any disabled state |
Hover/press: Hero CTA uses --accent-hover / --accent-press; others use their -hover / -press tokens.
Focus-visible: 2px --blue outline with 2px offset; on blue or red surfaces use a 2px white outline.

## Text
- Headings, body, numbers, prices: --text-primary
- Secondary labels, captions, timestamps: --text-secondary
- Links: --blue, underlined
- Text on blue: white. Text on --accent: white bold 19px+. Text on --danger: white.
- Error messages: --danger with an icon. Never use --accent for text.

## Cards
- Standard: --bg-card, 1px --border, 12px radius
- Selected/active card: 2px --blue border + --blue-tint bg
- Order card header strip: color by status (see badges), never --accent
- KPI card: value in --blue; delta up = --success, delta down = --danger (with arrow icon)
- Promo/feature card (optional, 1 max per screen): --blue bg, white text, small --accent decorative detail

## Badges / status chips (tint bg + solid text, always with label)
| Status | Bg | Text |
|---|---|---|
| New | --info-new-tint | --info-new |
| Preparing | --warning-tint | #8A4B0C |
| Ready | --success-tint | --success |
| Paid / Completed | --success-tint | --success |
| Pending / Draft | --bg-muted | --text-secondary |
| Cancelled / Rejected | --danger-tint | --danger (+ x icon) |
| Overdue | --danger | white (+ clock icon) |
| Count/notification dot | --accent | white, bold |
Veg marker: --success outline + dot. Non-veg marker: --danger outline + dot.

## Charts / graphs
- Series order: 1 --blue, 2 --info-new, 3 #8DA2BF (light blue-gray), 4 --warning, 5 --success
- Single series: --blue. Highlighted bar/point (e.g. today, peak): --accent; other bars: --blue or #8DA2BF.
- Never use --accent or --danger as a regular series color.
- Gridlines: --border (1px, dashed). Axis labels: --text-secondary. Chart bg: --bg-card.
- --success / --danger only for positive/negative deltas.
- Pie/donut: same series order, 2px --bg-card gap between slices, labels outside in --text-primary.
- Tooltips: --blue bg, white text.

## Toasts / alerts
- Success: --success-tint bg, --success left bar, check icon
- Error: --danger-tint bg, --danger left bar, x icon
- Warning: --warning-tint bg, --warning left bar, triangle icon
- Info: --blue-tint bg, --blue left bar, info icon

## Contrast requirements
- Blue on cream ~9.3:1, white on blue ~11.5:1, white on --danger ~7:1.
- White on --accent #F03A2A ~3.9:1: allowed ONLY for large bold text (19px+) and icons 24px+. Red on cream ~3.2:1: icons and borders only, never text.
- Minimum 4.5:1 for text under 18px, 3:1 for icons and large text.
