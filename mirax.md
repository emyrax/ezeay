# Mirax: Explore reels retention and resource-post implementation plan

## Goal
Transform the Explore feed from a static lesson preview stream into an engagement-first learning loop built around hooks, micro-challenges, shareable insight, and user-generated study resources.

## Core product direction
The feed should feel like a learning arena, not a passive list.

Every reel should answer four questions immediately:
1. Why should I care?
2. What do I do?
3. What does the reveal teach me?
4. Why would I share or save this?

The retention loop is:
Hook -> decision -> reveal -> reward -> save/share -> next reel

---

## 1) Reel redesign: from passive card to active challenge card

### Current problem
The existing reels are mostly static summaries of lesson content. They show titles, difficulty, creator data, and some preview text, but they do not create an immediate decision moment or a learning tension.

### New structure for each reel
Each Explore reel should render in this order:

1. Top status bar
   - difficulty badge
   - realm or challenge tag
   - chapter label
   - creator or source label

2. Hook block
   - 1-line emotional hook
   - short challenge statement
   - it must create curiosity immediately

3. Decision block
   - prediction
   - vote
   - multiple-choice prompt
   - “best next move” choice
   - misconception reveal prompt

4. Reveal block
   - correct answer or best explanation
   - quick educational payoff
   - no long wall-of-text

5. Reward / progress block
   - XP or streak feedback
   - completion state
   - challenge status
   - small “saved / shared” confirmation

6. Utility / share block
   - save resource
   - share insight
   - open related chapter
   - open uploaded file

This creates a complete learning moment rather than a static card.

---

## 2) Hook strategy
Hook field must exist for every subtopic and resource post.

### What the hook does
A hook should:
- create tension
- trigger curiosity
- surface a misconception
- frame a clear learning win
- make the user want to answer

### Good hook examples
- “Most learners miss this because they memorize the answer instead of the pattern.”
- “This is the one mistake that breaks otherwise good study habits.”
- “The fastest path isn’t the obvious one.”
- “This question is a trap for most people.”

### Hook field requirements
Each generated or uploaded learning item should include:
- hook
- hookTone
- challengeType
- challengePrompt
- revealText
- shareCopy

---

## 3) Data model additions

### Subtopic / reel metadata
Each subtopic should include:

```ts
interface ReelHookMeta {
  hook: string;
  hookTone: "curious" | "challenge" | "misconception" | "fast-win";
  challengeType: "prediction" | "vote" | "multiple-choice" | "misconception";
  challengePrompt: string;
  challengeOptions: string[];
  correctChoiceIndex?: number;
  revealText: string;
  shareCopy: string;
  resourceType?: "handwritten" | "pdf" | "text" | "image" | "other";
  resourceSummary?: string;
  resourceTitle?: string;
  tags?: string[];
  difficulty?: string;
  realm?: string;
  xpReward?: number;
  streakReward?: number;
}
```

### Resource-post metadata
User-uploaded resources should include:

```ts
interface ExploreResourcePost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  type: "course_reel" | "resource" | "challenge";
  title: string;
  summary: string;
  hook: string;
  challengeType: "prediction" | "vote" | "multiple-choice" | "misconception";
  challengePrompt: string;
  challengeOptions: string[];
  correctChoiceIndex?: number;
  revealText: string;
  shareCopy: string;
  resourceType: "handwritten" | "pdf" | "text" | "image" | "other";
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageUrl: string;
  previewUrl?: string;
  previewText?: string;
  isPublic: boolean;
  tags: string[];
  likes: number;
  saves: number;
  shares: number;
  views: number;
  difficulty?: string;
}
```

---

## 4) Course generation update
When course generation runs, each subtopic should be enriched with hook metadata.

### Course generation output requirements
For each subtopic, generate:
- hook
- challengeType
- challengePrompt
- options
- reveal text
- share text
- optional resource summary if relevant

### Generation rule
The system should not generate only lesson content. It should generate retention-ready learning objects.

### Prompt design for generation
Use instructions like:
- generate a hook that is short, punchy, and curiosity-driven
- create one micro-challenge relevant to the concept
- ensure the challenge is easy to answer in under 10 seconds
- include a short reveal explanation that strengthens understanding
- produce a shareable insight in 1 sentence

This should be enforced in the course generation pipeline, not added as a later UI hack.

---

## 5) User-generated resource upload flow
Users can post resources from Explore.

### Supported uploads
- handwritten notes
- PDF files
- text files
- image files
- other files under 20MB

### Requirements
- max file size: 20MB
- validate file type before upload
- preview PDF first page if possible
- preview handwritten note image directly
- for text/PDF files, generate short extracted summary
- store metadata with the post

### Upload validation rules
- reject unsupported file extension
- reject file size above 20MB
- reject empty files
- show a friendly error if unsupported

### Post flow
1. user taps “Share resource” from Explore
2. choose resource type
3. upload file
4. add title + summary + optional hook override
5. AI generates challenge prompt and share copy automatically
6. post is published to Explore feed

---

## 6) Resource post rendering inside Explore
Resource cards should render like a challenge card with a file preview, not like a raw browser attachment.

### Resource reel structure
1. resource badge / type label
2. hook line
3. uploaded file preview
4. brief summary
5. challenge prompt
6. answer or vote options
7. reveal and insight
8. save/share/open actions

### Resource preview types
- handwritten note → image preview
- PDF → first-page thumbnail or file icon
- text → excerpt preview
- other → file icon + file name

### Resource utility actions
- open file
- save to library
- share a takeaway
- copy a short summary
- ask for explanation

---

## 7) Mixed-feed behavior
The Explore feed should blend multiple content types:
- AI-generated course reels
- challenge reels
- user resource posts
- community-shared notes

### Feed sorting strategy
Sort by:
- engagement score
- recency
- challenge completion rate
- share rate
- save rate

This keeps the feed feeling lively and varied.

---

## 8) Engagement loop mechanics

### Example flow
- user sees hook
- taps a choice
- answer is revealed immediately
- reward feedback is shown
- the user saves or shares the result
- next reel appears naturally

### Required user states
- not answered yet
- answered correctly
- answered incorrectly
- saved resource
- shared insight
- opened chapter / file

### Feedback principles
- wrong answers should reveal the reasoning immediately
- do not punish users with repeated loops unless the format intentionally calls for it
- keep the flow educational and motivating
- focus on momentum, not friction

---

## 9) UI behavior for wrong answers
When a user selects a wrong answer:
- show the correct answer clearly
- show a quick explanation
- show the concept or reasoning behind it
- optionally show a “retry later” or “save resource” CTA

This reduces burnout and prevents repeated guesswork.

---

## 10) Retention strategy
The experience must feel like a learning challenge loop rather than a content list.

### Retention levers
- streaks
- quest progression
- challenge score
- quick answer prompts
- reward after correct answer
- shareable takeaways
- saveable resources

### Highlighted states
- “You earned +20 XP”
- “Saved to your notes”
- “Shared with your study group”
- “This concept matters because…”

---

## 11) Recommended implementation order

### Phase 1: schema and model
- add hook/challenge fields
- add resource post model
- support upload metadata

### Phase 2: generation and validation
- generate hook data during course creation
- validate resource upload size and type

### Phase 3: reel template update
- add hook block
- add decision block
- add reveal block
- add reward block

### Phase 4: resource post support
- upload handler
- preview rendering
- share/save/actions

### Phase 5: feed integration and ranking
- mixed feed sorting
- challenge interaction state
- share/resource analytics

### Phase 6: optimization
- retention tests
- hook A/B testing
- challenge type tuning
- resource save/share conversion

---

## 12) Engineering principles
- Keep the feed data-driven and structured.
- Never hardcode a reel to one static template.
- Generate metadata for both AI items and resource items.
- Make every item shareable and saveable.
- Keep the challenge lightweight and fast.

---

## 13) Success metrics
Track:
- average reel dwell time
- answer completion rate
- share rate
- save rate
- open resource rate
- reel-to-course conversion
- user return rate after 24 hours

The primary signal is whether users stay engaged long enough to answer and interact, not just scroll.

---

## 14) Final product recommendation
The strongest version of this product treats Explore as both:
- a learning challenge feed
- a peer resource-sharing layer

This makes it feel like a high-energy knowledge loop rather than a static content feed.

The core rule:
Every item in Explore must have a hook, a decision point, a reveal, and a shareable takeaway.

That is the retention engine.
