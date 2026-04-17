# Daily Workflow: Building Diary Cards Together

This guide describes the complete daily workflow for creating a new DBT diary card with your therapist/agent.

## Overview

```
Step 1: Conversational Session (5-10 min)
   ↓
Step 2: Agent Structures YAML (1 min)
   ↓
Step 3: Review & Adjust (2-3 min)
   ↓
Step 4: Save & Generate (1 min)
   ↓
Step 5: Published & Tracked (live on CF Pages)
```

## Step 1: Conversational Session

You and your therapist/agent discuss the day. You provide diary information conversationally.

### Example Conversation

**Agent:** "Let's create today's diary card. Tell me about your day."

**You:** "Today was really hard. My suicidal urges were about a 7, self-harm urges around 5. I felt really sad - maybe 8 out of 10. Anxious too, about 7. Angry maybe a 6."

**Agent:** "I'm capturing that. Did you use any skills?"

**You:** "Yeah, I did. I used mindfulness when I was really anxious - that breathing thing. And I tried the opposite action for my sadness, went for a walk even though I didn't want to."

**Agent:** "Great progress. How was your sleep?"

**You:** "Only about 6 hours, and it wasn't great sleep - maybe 5 quality. But I took my meds. I went to therapy today. Did my homework - finished that worksheet on emotion regulation."

**Agent:** "Excellent. Anything else to capture?"

**You:** "Yeah, had a conflict with a family member this morning which set off the anxiety. But I managed it better than I would have before."

## Step 2: Agent Structures YAML

The agent organizes this into a normalized YAML entry.

```yaml
entry:
  date: "2026-04-17"
  therapist_id: "T001"
  
  target_behaviors:
    suicidal_urges: 7
    self_harm_urges: 5
  
  emotions:
    sadness: 8
    anxiety: 7
    anger: 6
  
  skills:
    mindfulness: true
    distress_tolerance: false
    emotion_regulation: true
    interpersonal_effectiveness: false
  
  functioning:
    sleep_hours: 6
    sleep_quality: 5
    medication_compliance: true
    work_school: 0  # (not mentioned)
    social_contact: 0  # (not mentioned)
    exercise_minutes: 0  # (not mentioned - but opposite action walk counts!)
  
  therapy:
    individual_session: true
    homework_completion: 9
    homework_notes: "Emotion regulation worksheet completed"
  
  notes:
    general: "Difficult day but made progress using skills"
    triggers: "Family conflict in morning"
    skills_context: "Mindfulness breathing for anxiety. Opposite action (walking) for sadness."
    therapist_focus: "Continue emotion regulation work. Family conflict patterns improving."
```

## Step 3: Review & Adjust

The agent shows you the YAML. You review it for accuracy.

**Agent:** "Here's what I captured. Does this look right?"

**You:** "Actually, the exercise - when I went for that walk, that was about 30 minutes. And I did also reach out to a friend on text, so social contact maybe was like a 5."

**Agent:** "Updating exercise to 30 minutes and social contact to 5. Anything else?"

**You:** "That looks good."

## Step 4: Save & Generate

Agent saves the entry and runs the generation script.

```bash
# Step 4a: Save normalized entry
data/diary-2026-04-17.yaml

# Step 4b: Generate semantic spec
npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-17.yaml
→ Creates: specs/diary-spec-2026-04-17.yaml

# Step 4c: Build with Gutenberg
gutenberg_build ./gutenberg.yaml
→ Creates: rendered/diary-2026-04-17.html

# Step 4d: Deploy to CF Pages
gutenberg_publish ./gutenberg.yaml
→ Live at: dbt-diary-cards.pages.dev/diary-2026-04-17

# Step 4e: Git commit
git add data/diary-2026-04-17.yaml
git commit -m "Add diary entry for 2026-04-17"
```

**Agent Output:**
```
✓ Saved: data/diary-2026-04-17.yaml
✓ Generated: specs/diary-spec-2026-04-17.yaml
✓ Built: rendered/diary-2026-04-17.html
✓ Deployed: dbt-diary-cards.pages.dev/diary-2026-04-17
✓ Committed to git history

Your diary card is live!
```

## Step 5: Live & Tracked

Your diary entry is now:
- **Live** at: `dbt-diary-cards.pages.dev/diary-2026-04-17`
- **Tracked** in git for historical record
- **Normalized** in standard format for analysis
- **Beautiful** rendered in your theme (ink)

## Alternative: Using the Template

If you prefer to fill out a form first, you can use the template:

```bash
# Copy template
cp templates/diary-entry-template.yaml data/diary-2026-04-17.yaml

# Edit in your favorite editor
# (adds suicidal_urges: 7, emotions: {...}, etc.)

# Then generate and publish
npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-17.yaml
gutenberg_publish ./gutenberg.yaml
```

## Variations

### Quick Entry (Low-Energy Days)
Use minimal template with just the essentials:
```yaml
entry:
  date: "2026-04-17"
  therapist_id: "T001"
  target_behaviors:
    suicidal_urges: 2
    self_harm_urges: 1
  emotions:
    sadness: 2
  notes:
    general: "Okay day"
```

### Rich Entry (Detailed Tracking)
Use comprehensive template with all fields (see `data/diary-2026-04-17-comprehensive.yaml`).

### Multi-Day Catch-Up
Generate multiple entries in one session:
```bash
npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-15.yaml
npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-16.yaml
npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-17.yaml
gutenberg_publish ./gutenberg.yaml  # Publishes all at once
```

## Troubleshooting

### "Date validation error"
**Problem:** Error like `Invalid date format: "2026-4-17"`

**Solution:** Use full YYYY-MM-DD format: `"2026-04-17"`

### "At least one emotion is required"
**Problem:** Entry doesn't have any emotions

**Solution:** Add at least one emotion:
```yaml
emotions:
  sadness: 5
```

### "Suicidal urges must be 0-10"
**Problem:** You entered 15 instead of 0-10

**Solution:** Use 0-10 scale only. If need to express very severe, use 10.

### High suicidal urges warning
**Alert:** You see "High suicidal urges. Please reach out to crisis line"

**Action:** This is a safety check. Please contact:
- Your therapist
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741

## Tips for Success

1. **Consistency:** Build your diary card at the same time each day
2. **Honesty:** Be truthful about urges and emotions - that's the point
3. **Completeness:** Aim for "standard" entries most days
4. **Patterns:** Over time, you'll notice patterns in your data
5. **Share:** Show your therapist the rendered diary cards
6. **Adjust:** Work with your therapist to modify fields if needed

## Next Steps

Once you have a few entries, you can:
- View trends in your data
- Compare across weeks
- Build additional views (week grid, timeline, summaries)
- Export data for clinical analysis

Start with **one entry today**!
