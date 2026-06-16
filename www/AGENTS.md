# www/AGENTS.md

## Purpose

This file contains instructions for AI agents working inside:

```text
/www
```

Read and follow:

1. `/AGENTS.md`
2. Relevant files in `/docs`
3. This file

If instructions conflict:

```text
Project Documentation
    ↓
Root AGENTS.md
    ↓
www/AGENTS.md
```

---

# Website Purpose

This website exists to support the mobile application.

Primary goals:

- Explain the app
- Improve App Store SEO
- Improve search engine visibility
- Host privacy policy
- Host support page
- Host FAQ
- Host changelog

This is not a SaaS dashboard.

This is not a marketing-heavy startup website.

Keep it simple.

---

# Technology

Required:

- Astro
- TypeScript

Preferred:

- Static pages
- Server-rendered content
- Minimal JavaScript

Avoid:

- React unless necessary
- Client-side rendering
- Complex frameworks

Use Astro first.

---

# Design Philosophy

The website should feel:

- Minimal
- Fast
- Calm
- Trustworthy

Visual style should match the mobile application.

Prefer:

- White space
- Clear typography
- Small accents
- Clean layouts

Avoid:

- Marketing gimmicks
- Popups
- Cookie banners (unless required)
- Aggressive animations
- Dark patterns

---

# SEO

SEO is a first-class concern.

Every page should have:

- Title
- Description
- Canonical URL
- Open Graph tags
- Structured metadata when useful

Prefer semantic HTML.

Use:

```html
<header>
  <main>
    <section>
      <footer></footer>
    </section>
  </main>
</header>
```

instead of div-heavy layouts.

---

# Performance

Performance is more important than visual complexity.

Goals:

- Fast page load
- Excellent Lighthouse score
- Minimal JavaScript
- Small bundle size

Avoid:

- Large dependencies
- Heavy animations
- Video backgrounds
- Unnecessary client-side code

---

# Animations

Animations should be subtle.

Acceptable:

- Fade in
- Small hover effects
- Small scale effects
- Smooth transitions

Avoid:

- Parallax
- Scroll-jacking
- Heavy motion
- Large animated backgrounds

Animation should never distract from content.

---

# Content Structure

Expected pages:

```text
/
 /privacy
 /support
 /faq
 /changelog
```

Potential future pages:

```text
/blog
/features
/download
```

Only add pages when there is a clear reason.

---

# Privacy

The website should support the project's privacy-first philosophy.

Avoid:

- Tracking scripts
- Advertising scripts
- Third-party analytics

Prefer:

- No analytics
- Privacy-friendly analytics if explicitly approved

Privacy is part of the product.

---

# App Store Support

Website should support:

- Apple App Store listing
- Google Play listing

Maintain:

- Support URL
- Privacy Policy URL
- Contact information

These pages should remain stable.

---

# Content Writing

Writing style:

- Clear
- Direct
- Short
- Honest

Avoid:

- Hype
- Fake urgency
- Marketing buzzwords
- AI-generated sounding copy

Prefer factual descriptions.

---

# Assets

Prefer:

- SVG icons
- Optimized images
- Responsive assets

Avoid:

- Large PNG files
- Unoptimized screenshots
- Decorative assets without purpose

---

# Accessibility

Requirements:

- Semantic HTML
- Keyboard navigation
- Proper heading hierarchy
- Alt text for images
- Sufficient contrast

Accessibility is not optional.

---

# Dependencies

Before adding a dependency:

1. Can Astro solve this already?
2. Can plain HTML/CSS solve it?
3. Is JavaScript actually required?

Prefer fewer dependencies.

---

# Security

Never expose:

- Secrets
- API keys
- Tokens
- Credentials

Assume website source is public.

---

# Future Content

Future marketing and product content should align with:

```text
/docs/01-product-specification.docx
/docs/04-future-roadmap.docx
```

Do not invent product features.

Do not advertise features that do not exist.

---

# Decision Framework

When multiple solutions exist:

1. Prefer Astro-native solutions.
2. Prefer static generation.
3. Prefer SEO-friendly solutions.
4. Prefer simpler solutions.
5. Prefer fewer dependencies.

---

# Definition of Done

A task is complete when:

- Page renders correctly
- SEO metadata exists
- Accessibility is preserved
- Lighthouse score remains high
- Mobile layout works
- Desktop layout works
- No unnecessary JavaScript is added

---

# Website Philosophy

The website exists to support the application.

Content is more important than effects.

Speed is more important than animations.

Clarity is more important than marketing.
