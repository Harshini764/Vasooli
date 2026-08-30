# Animation & Visual Effects Guide

This guide documents all the animation components and effects added to enhance the RazorPay frontend with a "wow factor".

## Components Overview

### 1. **GlitterWrap** 🌟
Animated starfield warp tunnel with glittering sparkles. Creates an immersive background effect.

**Location:** `src/components/animations/GlitterWrap.tsx`

**Usage:**
```tsx
import { GlitterWrap } from '@/components/animations';

<GlitterWrap
  particleCount={600}
  color1="#ffffff"
  color2="#c7d2fe"
  color3="#a5b4fc"
  speed={4}
  density={80}
  starSize={15}
  focalDepth={12}
  turbulence={0.5}
  brightness={80}
  glitterIntensity={4}
  trailAmount={90}
  reverse={false}
/>
```

**Props:**
- `particleCount` (number): Number of particles (stars) - default 500
- `color1/color2/color3` (string): Hex colors for the particle palette
- `speed` (1-10): Animation speed
- `density` (1-100): Spawn area density
- `starSize` (0-20): Base particle size
- `focalDepth` (1-30): Focal point depth
- `turbulence` (0-10): Wobble intensity
- `brightness` (0-100): Particle brightness
- `glitterIntensity` (0-10): Sparkle flash intensity
- `trailAmount` (0-100): Motion trail decay
- `reverse` (boolean): Animation direction

---

### 2. **HeroSection** 🚀
Complete hero section with GlitterWrap background, gradient text, CTA buttons, and animated stats.

**Location:** `src/components/animations/HeroSection.tsx`

**Usage:**
```tsx
import { HeroSection } from '@/components/animations';

<HeroSection />
```

**Features:**
- Animated glitter starfield background
- Gradient overlay
- Fade-in animations on load
- Gradient text heading
- CTA buttons with hover effects
- Animated stats display

---

### 3. **AnimatedCard** 📦
Card wrapper with fade-up animation and customizable delay.

**Usage:**
```tsx
import { AnimatedCard } from '@/components/animations';

<AnimatedCard delay={100} className="custom-class">
  <div>Your content here</div>
</AnimatedCard>
```

**Props:**
- `delay` (number, ms): Animation delay
- `className` (string): Additional CSS classes

---

### 4. **GradientText** ✨
Text with animated gradient background.

**Usage:**
```tsx
import { GradientText } from '@/components/animations';

<GradientText from="from-indigo-600" to="to-blue-600">
  Recover Failed Payments
</GradientText>
```

**Props:**
- `from` (string): Tailwind gradient start color
- `to` (string): Tailwind gradient end color
- `className` (string): Additional CSS classes

---

### 5. **GlowEffect** 💫
Wrapper that adds a subtle glow shadow effect.

**Usage:**
```tsx
import { GlowEffect } from '@/components/animations';

<GlowEffect color="indigo" intensity="medium">
  <div>Content with glow</div>
</GlowEffect>
```

**Props:**
- `color` ('indigo' | 'blue' | 'violet' | 'purple'): Shadow color
- `intensity` ('light' | 'medium' | 'strong'): Glow intensity
- `className` (string): Additional CSS classes

---

### 6. **FloatingElement** 🎈
Element that floats up and down smoothly.

**Usage:**
```tsx
import { FloatingElement } from '@/components/animations';

<FloatingElement duration={6} delay={0}>
  <div>Floating content</div>
</FloatingElement>
```

**Props:**
- `duration` (number, seconds): Animation duration
- `delay` (number, seconds): Animation delay
- `className` (string): Additional CSS classes

---

### 7. **PulseElement** 💗
Element with a gentle pulse animation.

**Usage:**
```tsx
import { PulseElement } from '@/components/animations';

<PulseElement duration={2}>
  <div>Pulsing content</div>
</PulseElement>
```

**Props:**
- `duration` (number, seconds): Pulse duration
- `className` (string): Additional CSS classes

---

### 8. **FeatureGrid** 🎯
Grid display of feature cards with gradients and glow effects.

**Location:** `src/components/animations/FeatureCards.tsx`

**Usage:**
```tsx
import { FeatureGrid } from '@/components/animations';

<FeatureGrid
  features={[
    {
      icon: <Icon />,
      title: 'Smart Recovery',
      description: 'AI-powered retry logic',
      delay: 0,
    },
    // More features...
  ]}
/>
```

**Props:**
- `features` (array): Array of feature objects with icon, title, description
- `className` (string): Additional CSS classes

---

### 9. **StatsDisplay** 📊
Animated stats counter with gradient text.

**Usage:**
```tsx
import { StatsDisplay } from '@/components/animations';

<StatsDisplay
  stats={[
    { value: '94%', label: 'Recovery Rate', icon: <TrendingUp /> },
    { value: '< 2s', label: 'Processing Speed' },
    { value: '500+', label: 'Active Merchants' },
  ]}
/>
```

---

### 10. **GradientButton** 🎛️
Button with gradient background and hover scale effect.

**Usage:**
```tsx
import { GradientButton } from '@/components/animations';

<GradientButton
  size="lg"
  variant="primary"
  onClick={() => console.log('clicked')}
>
  Get Started
</GradientButton>
```

**Props:**
- `size` ('sm' | 'md' | 'lg'): Button size
- `variant` ('primary' | 'secondary'): Button variant
- `onClick` (function): Click handler
- `className` (string): Additional CSS classes

---

## CSS Animations

All animation keyframes are defined in `src/index.css`:

### Available Animations:
- **float**: Smooth up-down floating motion
- **glow-pulse**: Pulsing glow shadow effect
- **gradient-shift**: Gradient position shifting
- **shimmer**: Shimmer/loading effect
- **bounce-in**: Elastic bounce entrance
- **slide-up-fade**: Fade in while sliding up
- **fin-fade-up**: Financial-style fade up (existing)
- **fin-slide-left**: Financial-style slide left (existing)
- **fin-success-pulse**: Success pulse (existing)

### CSS Classes:
```css
.animate-float           /* Apply float animation */
.animate-glow-pulse      /* Apply glow pulse */
.animate-gradient-shift  /* Apply gradient shift */
.animate-shimmer         /* Apply shimmer */
.animate-bounce-in       /* Apply bounce in */
.animate-slide-up-fade   /* Apply slide and fade */
.fin-fade-up            /* Financial fade up */
.fin-slide-left         /* Financial slide left */
```

---

## Integration Examples

### Adding Hero to a Page:
```tsx
import { HeroSection } from '@/components/animations';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <div>Rest of page content</div>
    </>
  );
}
```

### Using AnimatedCard in Lists:
```tsx
import { AnimatedCard, GradientText } from '@/components/animations';

{data.map((item, i) => (
  <AnimatedCard key={item.id} delay={i * 100}>
    <div className="card">
      <GradientText>{item.title}</GradientText>
      <p>{item.description}</p>
    </div>
  </AnimatedCard>
))}
```

### Creating Visual Interest in Stats:
```tsx
import { StatsDisplay, GlowEffect } from '@/components/animations';

<GlowEffect color="indigo" intensity="strong">
  <StatsDisplay stats={statsData} />
</GlowEffect>
```

---

## Performance Tips

1. **Limit Particle Count**: For GlitterWrap, keep particle count under 800 for smooth 60fps
2. **Use RequestAnimationFrame**: All animations use RAF for smooth performance
3. **Reduce Animations on Mobile**: Consider reducing animation complexity for mobile devices
4. **Lazy Load Heavy Components**: Use React.lazy() for GlitterWrap on landing pages

---

## Color Palette

The animations use the project's established color scheme:
- **Primary**: Indigo (#4f46e5)
- **Secondary**: Blue (#2563eb)
- **Accent**: Violet (#7c3aed)
- **Supporting**: Cyan (#06b6d4)

---

## Browser Support

All animations use standard CSS and Web APIs:
- CSS animations (supported in all modern browsers)
- Canvas API for GlitterWrap (IE11+, all modern browsers)
- RequestAnimationFrame (all modern browsers)
- CSS Grid/Flexbox (all modern browsers)

---

## Customization

To customize colors throughout animations:
1. Edit Tailwind config for theme colors
2. Modify color values in individual components
3. Update gradient colors in `index.css`

Example:
```tsx
// Change gradient colors in components
from="from-purple-600" to="to-pink-600"
```

---

## Future Enhancements

Potential additions:
- [ ] Parallax scroll effects
- [ ] Intersection Observer for animation triggers
- [ ] Theme toggle animations
- [ ] Loading skeleton animations
- [ ] Page transition effects
- [ ] Scroll progress indicators

---

## Troubleshooting

**Animations not showing?**
- Ensure `index.css` is imported in `main.tsx`
- Check that Tailwind CSS is properly configured

**Performance issues?**
- Reduce particle count in GlitterWrap
- Disable animations on mobile with media queries
- Use `will-change` CSS sparingly

**Colors not applying?**
- Verify Tailwind class names are correct
- Check color contrast for accessibility
- Use dark mode variants (dark:) for dark theme

---

Made with ✨ for enhanced visual appeal!
