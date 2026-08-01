---
name: brand-guidelines
description: Applies Atlas Blech Center's official brand colors and typography to any sort of artifact that may benefit from having ABC's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.
---

# Atlas Blech Center Brand Styling

## Overview

To access Atlas Blech Center's official brand identity and style resources, use this skill.

**Keywords**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, ABC brand, visual formatting, visual design, Atlas Blech Center, ALG, Atlas LLM Gateway

## Brand Guidelines

### Colors

**Primary Color:**

- Atlas Blue: `#3838FF` (RGB: 56/56/255) - Primary brand color, CTAs, links, accents

**Neutral Colors:**

- Black: `#1D1D1B` (RGB: 29/29/27) - Primary text
- Dark Gray: `#575756` (RGB: 87/87/86) - Secondary text
- Medium Gray: `#B2B2B2` (RGB: 178/178/178) - Disabled states
- Light Gray: `#E1E1E1` (RGB: 225/225/225) - Backgrounds, borders
- White: `#FFFFFF` - Light backgrounds

### Typography

- **Primary Font**: Helvetica Neue (with Arial, sans-serif fallback)
- **Headings**: Helvetica Neue Medium (Font-weight: 500)
- **Body Text**: Helvetica Neue Roman (Font-weight: 400)
- **Note**: Fonts should be pre-installed in your environment for best results

## Features

### Smart Font Application

- Applies Helvetica Neue Medium to headings (24pt and larger)
- Applies Helvetica Neue Roman to body text
- Automatically falls back to Arial if custom fonts unavailable
- Preserves readability across all systems

### Text Styling

- Headings (24pt+): Helvetica Neue Medium (Font-weight: 500)
- Body text: Helvetica Neue Roman (Font-weight: 400)
- Smart color selection based on background
- Preserves text hierarchy and formatting

### Shape and Accent Colors

- Non-text shapes use Atlas Blue as primary accent
- Maintains visual interest while staying on-brand
- Technical-modern aesthetic

## Technical Details

### Font Management

- Uses system-installed Helvetica Neue fonts when available
- Provides automatic fallback to Arial
- No font installation required - works with existing system fonts
- For best results, pre-install Helvetica Neue in your environment

### Color Application

- Uses RGB color values for precise brand matching
- Applied via python-pptx's RGBColor class
- Maintains color fidelity across different systems

## Brand Values

### Communication Style
- **Technical-Modern** - Clear and "Bold"
- **Friendly & approachable** - yet confident & competent
- Reliability, structure and top service

### Design Principles
- Clear structures, no cluttered layouts
- Confident, generous typography
- Industrial-professional look
- Reflect ABC values: Reliability, precision, service