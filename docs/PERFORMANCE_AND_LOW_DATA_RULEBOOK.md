# Performance and Low-Data Rulebook for LLMs

This document defines the mandatory performance, bandwidth, and user-experience rules for any LLM modifying this React and Next.js codebase.

The goal is to make the application:

- Fast on slow or unstable internet connections
- Responsive on low-powered devices
- Efficient in mobile-data usage
- Resilient when optional resources fail or load slowly
- Easy to measure and continuously improve

The central principle is:

> Send the smallest useful amount of data first. Load, enhance, or improve everything else only when it is actually needed.

This rulebook applies the same broad philosophy used by highly optimised communication applications: adapt to the available connection, prioritise continuity, reduce unnecessary payloads, and degrade gracefully.

---

## 1. Core Engineering Rules

The LLM must follow these rules for every feature, refactor, component, route, API, and database query.

### Rule 1: Minimise transferred data

Never send data, JavaScript, images, media, or API fields that the user does not currently need.

Before adding anything to the initial page load, ask:

1. Is this required for the first visible screen?
2. Can it be loaded after interaction?
3. Can it be fetched only when visible?
4. Can the payload be smaller?
5. Can the result be cached?
6. Can the browser render useful content before it arrives?

### Rule 2: Prioritise useful content over maximum quality

When there is a trade-off between continuity and visual quality, prefer continuity.

Examples:

- Show a lower-resolution image rather than blocking the page.
- Show a skeleton while slower content streams in.
- Load a video thumbnail before loading the player.
- Render core text before loading charts or animations.
- Return the first page of results instead of the entire dataset.

### Rule 3: Degrade gracefully

Optional features must not prevent the page from working.

A slow or failed:

- Chart
- Recommendation panel
- Video
- Analytics script
- AI feature
- PDF preview
- Rich-text editor
- Third-party widget

must not block navigation, authentication, reading, saving, or other core actions.

### Rule 4: Measure instead of guessing

Every performance-related decision should be validated using:

- Production builds
- Browser Network tools
- Slow-network throttling
- Lighthouse
- Core Web Vitals
- Bundle analysis where appropriate
- API response sizes
- Database query inspection

---

## 2. React and Next.js Component Rules

## 2.1 Use Server Components by default

In the Next.js App Router, components should remain Server Components unless they genuinely require browser-side behaviour.

Do not add `"use client"` to an entire page or layout merely because one small section needs interactivity.

Bad:

```tsx
"use client";

export default function DashboardPage() {
  return <Dashboard />;
}
```

Better:

```tsx
import SearchBox from "./SearchBox";
import NoteList from "./NoteList";

export default async function DashboardPage() {
  const notes = await getNotes();

  return (
    <main>
      <h1>Your notes</h1>
      <SearchBox />
      <NoteList notes={notes} />
    </main>
  );
}
```

```tsx
"use client";

export default function SearchBox() {
  return <input type="search" placeholder="Search notes" />;
}
```

Only the interactive component should become a Client Component.

### The LLM must use `"use client"` only when a component needs:

- React state
- React effects
- Event handlers
- Browser APIs
- Client-only libraries
- Local storage
- WebSocket or real-time browser logic
- Client-side form interactivity that cannot be handled through Server Actions

### The LLM must not use `"use client"` for:

- Static text
- Layout
- Database access
- Server-side data fetching
- Metadata
- Non-interactive lists
- Formatting that can happen on the server
- Components that only receive and display props

---

## 2.2 Keep Client Components small

Client boundaries must be as narrow as possible.

Do not turn a whole page into a Client Component because of:

- One button
- One modal
- One search box
- One dropdown
- One animated icon
- One interactive chart

Extract the interactive section into a dedicated Client Component.

The LLM should explicitly consider whether props crossing the server-client boundary are:

- Serializable
- Minimal
- Free of unnecessary nested data
- Free of sensitive server-only information

---

## 2.3 Avoid unnecessary React state and effects

Do not store derived values in state.

Bad:

```tsx
const [fullName, setFullName] = useState("");

useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
```

Better:

```tsx
const fullName = `${firstName} ${lastName}`;
```

Avoid `useEffect` for work that can happen:

- During rendering
- On the server
- In an event handler
- In a Server Action
- Through built-in Next.js data fetching

Each unnecessary effect increases complexity and may trigger additional renders or network requests.

---

## 2.4 Prevent unnecessary re-renders

The LLM must:

- Keep state close to where it is used.
- Avoid placing rapidly changing state high in the component tree.
- Avoid recreating large objects unnecessarily.
- Avoid passing oversized objects through many components.
- Use memoisation only when there is evidence it is helpful.
- Avoid premature use of `useMemo`, `useCallback`, and `React.memo`.

Memoisation is not automatically a performance improvement. It adds comparison and memory overhead.

---

## 3. Loading and Code-Splitting Rules

## 3.1 Lazy-load heavy optional features

Heavy features should not be part of the initial JavaScript bundle unless they are immediately required.

Good candidates for dynamic import include:

- Rich-text editors
- Markdown editors with large plugin sets
- PDF viewers
- Charts
- Syntax highlighters
- Code editors
- Video players
- AI assistants
- Date pickers
- Complex drag-and-drop tools
- Large modals
- Features hidden behind tabs
- Features behind a button or menu

Example:

```tsx
"use client";

import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("./RichTextEditor"),
  {
    loading: () => <p>Loading editor...</p>,
    ssr: false,
  }
);

export default function EditorContainer() {
  return <RichTextEditor />;
}
```

Do not use `ssr: false` without a genuine browser-only requirement.

---

## 3.2 Do not preload features the user may never use

The LLM must not eagerly download:

- Hidden modals
- Inactive tabs
- Closed editors
- Large charts below the fold
- Video players before playback
- Full datasets for collapsed sections

Use user interaction, visibility, or route navigation to trigger loading.

---

## 3.3 Use route-level code splitting

Keep unrelated features in separate routes or independently loaded modules.

Do not create one enormous dashboard bundle containing every feature in the application.

Where suitable, split features into routes such as:

```text
/dashboard
/notes
/flashcards
/quizzes
/progress
/settings
```

---

## 4. Streaming and Suspense Rules

## 4.1 Do not block the whole page on one slow operation

Use independent loading boundaries for sections that can render separately.

Example:

```tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <main>
      <DashboardHeader />

      <Suspense fallback={<NotesSkeleton />}>
        <RecentNotes />
      </Suspense>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </main>
  );
}
```

The page shell and useful content should appear before slow sections finish.

---

## 4.2 Use meaningful loading states

Fallbacks should preserve layout and communicate progress.

Prefer:

- Skeletons matching the expected layout
- Compact placeholders
- Clear loading messages for actions
- Disabled buttons during submission
- Partial page rendering

Avoid:

- Full-page spinners for one small section
- Blank areas
- Layout shifts
- Loading animations heavier than the content being loaded

---

## 4.3 Prioritise above-the-fold content

Content visible immediately after navigation should load before:

- Recommendations
- Related content
- Analytics
- Comments
- History panels
- Large media
- Secondary dashboards

---

## 5. Image Rules

## 5.1 Use `next/image`

Use Next.js `Image` for application images whenever compatible.

Example:

```tsx
import Image from "next/image";

export default function ProfileImage() {
  return (
    <Image
      src="/profile.jpg"
      alt="User profile"
      width={400}
      height={400}
      sizes="(max-width: 640px) 120px, 400px"
    />
  );
}
```

The LLM must provide:

- Accurate `width` and `height`, or a safe `fill` container
- Useful `alt` text
- A correct `sizes` value for responsive layouts
- Appropriate loading priority

---

## 5.2 Do not mark every image as priority

Only above-the-fold, important images should receive priority loading.

Do not prioritise:

- Images below the fold
- Gallery images
- Related-item thumbnails
- Hidden modal images
- Decorative images
- Avatars not immediately visible

---

## 5.3 Serve appropriately sized images

Do not display a 4000-pixel source in a 200-pixel container.

The LLM must consider:

- Mobile dimensions
- Desktop dimensions
- Device pixel ratio
- Thumbnail sizes
- Responsive `sizes`
- Crop requirements
- Compression level

---

## 5.4 Compress uploads at ingestion

User-uploaded images should be validated and transformed when uploaded.

Where suitable:

- Resize oversized images
- Remove unnecessary metadata
- Generate thumbnails
- Store modern formats
- Enforce file-size limits
- Reject unsupported or unsafe file types

Do not rely entirely on runtime image optimisation for huge original uploads.

---

## 5.5 Prefer efficient formats

Prefer modern formats such as:

- AVIF
- WebP

Retain compatible fallbacks where required.

Do not convert assets merely to create larger files or reduce compatibility without benefit.

---

## 6. Video and Audio Rules

## 6.1 Do not preload complete media unnecessarily

For ordinary video:

```tsx
<video
  controls
  preload="metadata"
  poster="/lesson-preview.webp"
>
  <source src="/lesson-720p.webm" type="video/webm" />
  <source src="/lesson-720p.mp4" type="video/mp4" />
</video>
```

Prefer `preload="metadata"` unless autoplay or immediate playback is a deliberate requirement.

---

## 6.2 Use thumbnails before players

Do not load a full YouTube, Vimeo, or custom player iframe on initial render when a lightweight preview can be shown.

Load the real player after the user presses Play.

---

## 6.3 Use adaptive streaming for serious media delivery

For substantial video features, use:

- HLS
- MPEG-DASH
- Multiple resolutions
- Multiple bitrates
- Appropriate codec fallbacks
- A media platform or transcoding pipeline

Do not serve one large, high-resolution file to every user regardless of connection or screen size.

---

## 6.4 Disable autoplay by default

Autoplay wastes bandwidth and may harm accessibility.

Only autoplay when:

- The media is muted
- It is essential to the experience
- The user has not enabled reduced-data or reduced-motion preferences
- The file is suitably small
- The behaviour is clearly justified

---

## 7. API and Data-Fetching Rules

## 7.1 Return only required fields

Every API response and database query must minimise selected fields.

Bad:

```ts
const cards = await prisma.flashcard.findMany();
```

Better:

```ts
const cards = await prisma.flashcard.findMany({
  take: 20,
  select: {
    id: true,
    question: true,
    updatedAt: true,
  },
});
```

Do not return:

- Full user records
- Large text fields not displayed
- Embeddings
- Internal metadata
- Nested relationships not required
- Authentication secrets
- Audit data not used by the current screen

---

## 7.2 Paginate large collections

Do not send entire collections when the user can initially view only a small portion.

Prefer cursor pagination:

```http
GET /api/flashcards?cursor=abc&limit=20
```

Example response:

```json
{
  "items": [],
  "nextCursor": "def",
  "hasMore": true
}
```

Use sensible maximum limits to prevent accidental or abusive oversized requests.

---

## 7.3 Avoid duplicate requests

The LLM must check whether data is already:

- Available from a parent Server Component
- Cached
- Included in the current response
- Stored in the current route state
- Returned by a Server Action
- Loaded by another component

Do not make several components independently fetch the same resource without a reason.

---

## 7.4 Cancel stale client requests

For client-side searches or filters:

- Debounce rapid input where appropriate.
- Abort outdated requests.
- Ignore stale responses.
- Avoid fetching after every keystroke without control.

Example:

```tsx
useEffect(() => {
  const controller = new AbortController();

  async function search() {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const data = await response.json();
    setResults(data);
  }

  if (query.trim()) {
    search().catch((error) => {
      if (error.name !== "AbortError") {
        console.error(error);
      }
    });
  }

  return () => controller.abort();
}, [query]);
```

---

## 7.5 Avoid client-side waterfalls

Do not build pages where:

1. The browser loads JavaScript.
2. JavaScript requests profile data.
3. Profile data triggers another request.
4. That response triggers another request.

Fetch required server-side data in parallel where possible.

Example:

```ts
const [profile, courses, progress] = await Promise.all([
  getProfile(),
  getCourses(),
  getProgress(),
]);
```

Only parallelise operations that do not depend on each other.

---

## 8. Database and Prisma Rules

## 8.1 Select minimal fields

Every Prisma query should use `select` where practical.

Do not fetch entire models by default.

---

## 8.2 Limit relationship loading

Avoid broad nested `include` statements.

Bad:

```ts
await prisma.user.findUnique({
  where: { id },
  include: {
    courses: {
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                quizzes: true,
              },
            },
          },
        },
      },
    },
  },
});
```

Prefer separate, focused queries or minimal nested selections.

---

## 8.3 Prevent N+1 queries

The LLM must inspect loops that query the database repeatedly.

Bad:

```ts
for (const course of courses) {
  course.lessonCount = await prisma.lesson.count({
    where: { courseId: course.id },
  });
}
```

Use aggregation, grouping, or a single relationship query where possible.

---

## 8.4 Add indexes intentionally

Frequently queried or sorted fields may require database indexes.

Consider indexes for:

- Foreign keys
- User ownership fields
- Frequently filtered statuses
- Cursor pagination fields
- Search keys
- Common sort fields
- Composite access patterns

Do not add indexes blindly. Each index increases write and storage cost.

---

## 8.5 Avoid unbounded queries

Every list query must have an intentional bound unless the dataset is proven tiny and fixed.

Use:

- `take`
- Cursor pagination
- Date windows
- Explicit filters
- Maximum export limits

---

## 9. Caching Rules

## 9.1 Cache stable shared data

Suitable caching candidates include:

- Public study resources
- Course metadata
- Static navigation data
- Public configuration
- Shared reference data
- Aggregated statistics
- Generated summaries that remain valid
- Expensive public computations

Example:

```ts
const response = await fetch("https://api.example.com/resources", {
  next: {
    revalidate: 300,
  },
});
```

---

## 9.2 Do not globally cache private user data

Private data must never be accidentally shared between users.

Use user-specific cache keys and understand the caching semantics before caching:

- Profiles
- Notes
- Flashcards
- Study history
- Authentication state
- Subscription information
- Private files

When uncertain, prefer correctness and privacy over caching.

---

## 9.3 Define revalidation deliberately

Do not use arbitrary cache durations.

Choose revalidation based on how quickly the data changes and how stale it is allowed to become.

Document unusually long or short cache durations.

---

## 9.4 Invalidate after mutations

When data changes, revalidate or invalidate the correct route or cache entry.

Do not rely on users refreshing repeatedly to see updated information.

---

## 10. Font Rules

Use `next/font` where appropriate.

Example:

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});
```

The LLM must:

- Prefer one primary font family.
- Prefer variable fonts where suitable.
- Load only required subsets.
- Avoid unnecessary font weights.
- Avoid duplicate font imports.
- Consider system fonts for the smallest possible payload.
- Prevent layout shifts caused by late font loading.

Do not load multiple decorative fonts without a strong design requirement.

---

## 11. Third-Party Script Rules

Third-party JavaScript must be treated as expensive and potentially unreliable.

Examples include:

- Analytics
- Heatmaps
- Chat widgets
- Advertising scripts
- Social embeds
- Video embeds
- A/B testing platforms
- Customer-support tools

Use `next/script` and an appropriate strategy.

Example:

```tsx
import Script from "next/script";

<Script
  src="https://example.com/widget.js"
  strategy="lazyOnload"
/>
```

The LLM must ask:

1. Is this script essential?
2. Can it load after interaction?
3. Can it load after the page becomes idle?
4. Can a lightweight alternative be used?
5. Does it send unnecessary user data?
6. Does it block rendering?
7. Does it harm Core Web Vitals?

Do not place third-party scripts directly in the critical rendering path without justification.

---

## 12. Low-Data Mode Rules

The application should support a user-controlled reduced-data mode where practical.

A reduced-data mode may:

- Disable autoplay
- Use smaller image sizes
- Avoid animated backgrounds
- Delay nonessential images
- Disable route prefetching for optional pages
- Reduce live updates
- Load fewer results per page
- Disable automatic media previews
- Replace video backgrounds with static images
- Reduce polling frequency
- Avoid loading recommendation panels automatically

A manual user preference is required for reliability.

Browser connection information may be used only as an enhancement.

Example:

```ts
type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

const connection = (
  navigator as Navigator & {
    connection?: NetworkInformation;
  }
).connection;

const shouldReduceData =
  connection?.saveData === true ||
  connection?.effectiveType === "slow-2g" ||
  connection?.effectiveType === "2g";
```

Do not assume the Network Information API is available in every browser.

---

## 13. Prefetching Rules

Next.js prefetching can improve navigation, but it also transfers data.

The LLM must avoid aggressive prefetching for:

- Large optional routes
- Links unlikely to be opened
- Media-heavy pages
- Administrative areas
- Low-data mode
- Large dynamic route lists

Prefetching should be selective, not automatic by assumption.

---

## 14. CSS and Animation Rules

## 14.1 Keep CSS efficient

The LLM must:

- Remove unused styles.
- Avoid shipping entire design systems for a few components.
- Avoid duplicate CSS frameworks.
- Avoid runtime styling libraries when static CSS is sufficient.
- Keep Tailwind content scanning correctly configured.
- Avoid enormous global stylesheets.

---

## 14.2 Respect reduced motion

Animations must respect:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not use constant background animations merely for decoration.

---

## 14.3 Prefer cheap animations

Prefer animating:

- `transform`
- `opacity`

Avoid frequent animation of:

- Width
- Height
- Top
- Left
- Large shadows
- Filters
- Properties that trigger repeated layout

---

## 15. Error and Resilience Rules

The application must remain useful when optional systems fail.

The LLM should add:

- Error boundaries where appropriate
- Route error states
- Retry controls
- Clear empty states
- Timeouts for external services
- Fallback content
- Defensive handling of partial API responses

Do not expose stack traces, secrets, or raw internal errors to users.

Do not repeatedly retry failed requests without limits.

---

## 16. Authentication and Security Performance Rules

Performance work must not weaken security.

Never improve speed by:

- Removing authentication checks
- Returning private data to the client
- Caching one user's data for another
- Disabling validation
- Trusting client-supplied ownership identifiers
- Exposing secrets in browser bundles
- Moving server-only logic into Client Components
- Skipping authorisation for prefetched routes

Server-side authorisation remains mandatory even when client-side controls exist.

---

## 17. Accessibility Rules

Performance optimisations must remain accessible.

The LLM must ensure:

- Images have appropriate alternative text.
- Loading states are announced where needed.
- Buttons remain keyboard accessible.
- Lazy-loaded content is reachable.
- Skeletons do not trap focus.
- Reduced-motion preferences are respected.
- Core content remains available without animation.
- Interactive controls have visible labels.
- Error messages are understandable.

Do not replace meaningful text with icons alone to save a negligible amount of data.

---

## 18. Performance Testing Checklist

Before considering a feature complete, the LLM should validate the following where relevant.

### Build checks

```bash
npm run lint
npm run build
```

Inspect:

- Build warnings
- Route rendering modes
- Large bundles
- Unexpected dynamic rendering
- Failed static generation
- Image configuration warnings
- Font warnings

### Browser testing

In browser developer tools:

1. Open the Network panel.
2. Disable cache.
3. Throttle to Slow 4G or Fast 3G.
4. Reload the page.
5. Inspect transferred bytes.
6. Inspect JavaScript execution.
7. Inspect image dimensions.
8. Inspect repeated requests.
9. Inspect API payload sizes.
10. Test navigation after first load.

### Lighthouse and Web Vitals

Monitor:

- Largest Contentful Paint
- Interaction to Next Paint
- Cumulative Layout Shift
- Time to First Byte
- Total transferred bytes
- JavaScript execution time
- Main-thread blocking
- Accessibility regressions

### Low-powered device assumptions

The feature should not assume:

- Desktop-class CPU
- Large memory
- Stable Wi-Fi
- Unlimited data
- High-resolution screen
- Modern flagship phone
- Warm cache

---

## 19. LLM Decision Checklist

Before generating or modifying code, the LLM must answer internally:

### Component decision

- Can this remain a Server Component?
- Is `"use client"` genuinely necessary?
- Can the interactive boundary be smaller?
- Am I sending unnecessary props to the browser?

### Loading decision

- Is this required immediately?
- Can this be dynamically imported?
- Can this stream independently?
- Does the loading fallback preserve layout?

### Data decision

- Am I selecting only required database fields?
- Is this response paginated?
- Can requests run in parallel?
- Is this request duplicated?
- Can this result be safely cached?

### Media decision

- Is the image correctly sized?
- Is `sizes` accurate?
- Should this image be lazy-loaded?
- Should this video load only after interaction?
- Is adaptive media delivery required?

### Third-party decision

- Is this library necessary?
- Is there a smaller alternative?
- Can it execute later?
- Is it included globally when only one page needs it?

### Resilience decision

- What happens on slow internet?
- What happens if this request fails?
- Can the page still provide core value?
- Is there a reduced-data path?

---

## 20. Anti-Patterns the LLM Must Avoid

Do not:

- Add `"use client"` to whole pages without necessity.
- Fetch all database columns by default.
- Return unbounded lists.
- Load every feature during initial render.
- Import heavy libraries globally.
- Use full video players as initial thumbnails.
- Load all images with priority.
- Use giant phone images as tiny thumbnails.
- Create request waterfalls.
- Add repeated client polling without justification.
- Cache private data globally.
- use `npm audit fix --force` without reviewing breaking changes.
- Optimise solely to produce a perfect audit count.
- Add dependencies for trivial functionality.
- Add memoisation everywhere.
- Use full-page spinners for isolated sections.
- Make core features depend on analytics or third-party widgets.
- Sacrifice security or accessibility for speed.
- Claim a performance improvement without measuring it.

---

## 21. Preferred Architecture for This Project

The preferred architecture is:

```text
Next.js App Router
├── Server Components by default
├── Narrow Client Component boundaries
├── Server Actions for suitable mutations
├── Prisma queries selecting only required fields
├── Cursor pagination for large collections
├── Suspense boundaries around slow sections
├── next/image for application images
├── next/font with minimal weights and subsets
├── Dynamic imports for heavy optional features
├── Safe caching for public or correctly keyed data
├── User-controlled reduced-data mode
├── Selective route prefetching
├── Lightweight third-party integration
└── Continuous performance measurement
```

---

## 22. Optimisation Priority Order

When deciding what to improve first, use this order:

1. Reduce client-side JavaScript.
2. Reduce image and media transfer.
3. Reduce API and database payloads.
4. Remove request waterfalls.
5. Stream slow page sections.
6. Cache repeated safe work.
7. Lazy-load optional features.
8. Reduce third-party scripts.
9. Add reduced-data behaviour.
10. Measure and repeat.

---

## 23. Definition of Done

A feature is not complete merely because it works on a developer's machine.

A feature is complete when:

- Core functionality works.
- It works on a throttled connection.
- It does not transfer unnecessary data.
- It avoids unnecessary client JavaScript.
- Large datasets are paginated.
- Images and media are appropriately delivered.
- Slow sections do not block the full page.
- Errors degrade gracefully.
- Private data is not incorrectly cached.
- Accessibility remains intact.
- `npm run lint` passes.
- `npm run build` passes.
- Performance has been inspected rather than assumed.

---

## Final Instruction to the LLM

For every implementation, prefer the simplest design that sends less code, less data, and less media while preserving correctness, security, accessibility, and a smooth user experience.

When forced to choose:

> Prioritise immediate usefulness, continuity, and graceful degradation over maximum visual quality or unnecessary feature richness.
