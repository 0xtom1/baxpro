# Bourbon Alert Platform - Design Guidelines

## Design Approach
**Hybrid Strategy**: Combines premium spirits brand aesthetics (Diageo, The Macallan) for marketing pages with Linear-inspired utility for the dashboard. This balances the sophisticated bourbon enthusiast market with efficient alert management functionality.

## Core Design Principles
1. **Premium Simplicity**: Sophisticated without being ostentatious
2. **Information Clarity**: Alert data and pricing must be instantly scannable
3. **Trust & Security**: OAuth authentication should feel secure and seamless

---

## Typography System

**Font Families** (via Google Fonts):
- **Display/Headings**: Playfair Display (serif) - evokes premium spirits heritage
- **UI/Body**: Inter (sans-serif) - modern, highly legible for data/alerts

**Hierarchy**:
- H1 (Landing hero): Playfair Display, 3.5rem (56px), font-bold
- H2 (Section headings): Playfair Display, 2.5rem (40px), font-semibold
- H3 (Card titles): Inter, 1.5rem (24px), font-semibold
- Body text: Inter, 1rem (16px), font-normal
- Small text (labels, meta): Inter, 0.875rem (14px), font-medium

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 8, 12, 16, 20** (e.g., p-4, m-8, gap-12)

**Container Strategy**:
- Landing page sections: `max-w-7xl mx-auto px-6`
- Dashboard content: `max-w-6xl mx-auto px-6`
- Form containers: `max-w-2xl`

**Vertical Rhythm**:
- Section padding: `py-20` (desktop), `py-12` (mobile)
- Component spacing: `gap-8` for major elements, `gap-4` for related items

---

## Page-Specific Layouts

### Landing Page
**Structure** (5 sections):

1. **Hero Section** (80vh):
   - Full-width background image: Premium bourbon bottles in warm, atmospheric lighting (amber tones, soft focus, sophisticated product photography)
   - Centered content overlay with backdrop blur on CTA container
   - H1: "Never Miss Your Perfect Pour"
   - Subheading: Clean description of service
   - Primary CTA: "Get Started Free" with Google/Apple login buttons below
   - Small trust indicator: "Tracking 500+ premium bourbons"

2. **How It Works** (3-column grid on desktop, stack on mobile):
   - Icon + Title + Description cards
   - Cards: Create Alert → Set Criteria → Get Notified
   - Use `grid grid-cols-1 md:grid-cols-3 gap-8`

3. **Features Showcase** (2-column alternating):
   - Left: Feature description / Right: Visual representation (alternates)
   - Features: Multi-string matching, Price filtering, Instant notifications
   - Each row: `grid md:grid-cols-2 gap-12 items-center`

4. **Social Proof**:
   - Single centered testimonial with quotation styling
   - Smaller supporting testimonials in 2-column grid below
   - Attribution with small bottle icon (from icon library)

5. **Final CTA Section**:
   - Centered, generous padding (py-24)
   - H2: "Start Tracking Your Dream Bottles"
   - Auth buttons with supporting text: "Free forever. No credit card required."

### Dashboard (Alert Management)
**Layout**:
- Top navigation bar: Logo left, "New Alert" button + User menu right
- Main content area: `max-w-6xl mx-auto`
- Alert cards in single column for clarity (not grid)

**Alert Card Design**:
- Card structure: `border rounded-lg p-6 space-y-4`
- Header row: Bourbon name criteria (bold) + Price badge + Actions (Edit/Delete icons)
- Match strings: Pill-style tags showing all search terms (`flex flex-wrap gap-2`)
- Metadata row: Created date, Status indicator
- Hover state: Subtle elevation change

**Empty State**:
- Centered content with bottle icon
- "No alerts yet" message
- Large "Create Your First Alert" button

### Alert Creation/Edit Modal
**Structure**:
- Overlay with backdrop blur
- Modal: `max-w-2xl` centered card
- Form sections with clear labels and spacing

**Form Layout**:
- Title input (full width)
- Match strings: Dynamic input group (add/remove rows)
- Price input: Number field with "Maximum price" label
- Action buttons: Cancel (secondary) + Save Alert (primary)

---

## Component Library

### Navigation
- **Landing**: Transparent overlay on hero, sticky scroll with backdrop blur
  - Logo left, "Login" button right
- **Dashboard**: Solid bar, `h-16`, logo + user dropdown

### Buttons
- **Primary**: Medium size, rounded, font-semibold
- **Secondary**: Outlined variant
- **Icon buttons**: Square, hover state, used for Edit/Delete actions

### Auth Buttons
- Google: White background, Google logo, "Continue with Google"
- Apple: Dark treatment, Apple logo, "Continue with Apple"
- Side-by-side on desktop, stacked on mobile

### Cards
- Alert cards: Border, rounded corners, padding, hover elevation
- Feature cards: Centered content, icon at top

### Form Inputs
- Text inputs: Border, rounded, adequate padding, focus ring
- Number inputs: Same styling with increment controls
- Labels: Above inputs, font-medium, small margin-bottom

### Icons
- Use **Heroicons** (outline style) via CDN
- Common icons: Plus (new alert), Pencil (edit), Trash (delete), Bell (notifications), Check (success)

---

## Images

**Hero Image**:
- Full-width background image for landing hero
- Subject: Premium bourbon bottles with warm, sophisticated lighting
- Treatment: Subtle overlay gradient to ensure text readability
- Placement: Behind hero content with `bg-cover bg-center`

**Optional Feature Visuals**:
- Screenshots or illustrations of alert functionality
- Bourbon bottle imagery for empty states or decorative elements

---

## Accessibility
- All form inputs with proper labels
- Focus states on all interactive elements
- ARIA labels for icon-only buttons
- Keyboard navigation throughout
- Color contrast maintained for readability

---

## Animations
**Minimal Use**:
- Alert card hover: Subtle translate-y and shadow change
- Modal entrance: Fade in with slight scale
- Button interactions: Built-in states only
- **No scroll-triggered animations** on landing page