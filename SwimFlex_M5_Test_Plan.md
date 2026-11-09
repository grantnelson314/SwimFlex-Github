# SwimFlex M5 Evaluation Plan

## Evaluation objective

M5 should evaluate both **usability** (can swimmers understand and move through the interface?) and **concept usefulness** (does SwimFlex solve a real problem they would want help with?). The same prototype, task wording, and starting states should be used with all five participants unless a defect prevents the evaluation from continuing.

Use the deployed prototype on a phone when possible. The smartwatch can be shown through the built-in simulator. Assign participants neutral IDs such as P1-P5 in notes and the final report.

## What this evaluation is trying to learn

1. Can swimmers tell how to choose a workout and adapt it before getting in the pool?
2. Do they understand the Priority Set and the reasoning behind an adjusted workout?
3. Can they meaningfully compare the original and adjusted workout before accepting it?
4. Is the information hierarchy in Pool Mode appropriate for a swimmer who is actively training?
5. Is Quick Adjust understandable and useful during a workout?
6. Does the smartwatch interaction feel more appropriate than phone interaction for pool-deck/in-workout use?
7. Which adaptation scenarios feel genuinely useful enough that swimmers would use SwimFlex in real life?
8. What would make swimmers trust or distrust an automated workout recommendation?

---

## Session structure

### 1. Introduction and initial impression

Give only a short concept introduction. Do not teach the participant how to complete the tasks.

Suggested introduction:

> SwimFlex is a prototype for swimmers who already have structured workouts but sometimes need to adjust them because of time, fatigue, equipment, pool conditions, or how the workout is going. I am testing the design, not you. Please say what you are thinking as you use it, including anything confusing or unexpected.

Before Task 1 ask:

- Based only on the home screen and this description, what do you think SwimFlex does?
- How useful does that idea sound for the way you currently swim? Why?

Record the participant's initial impression before explaining anything further.

---

## Task 1 — Adapt a planned workout before swimming

### Scenario

> You planned to swim **Tuesday Threshold**, a 2,500-yard workout estimated at 52 minutes. Today you only have about **40 minutes**. You still care most about keeping the main threshold set. Starting from the home screen, adjust the workout so it fits the time you have and decide whether you would use the recommendation.

### Starting state

Use **Demo → Return to Tuesday Threshold**, then return to the home screen so every participant begins from the same state.

### Do not tell the participant

Do not tell them where Adapt Workout is, how to select Tuesday Threshold, how Priority Set works, or how to compare the workouts.

### Observe

- What do they expect **Adapt Workout** to do?
- Do they understand that they are choosing which workout to adapt?
- Do they notice/understand Priority Set?
- Can they enter the 40-minute constraint without help?
- Do they understand the Proposed Changes screen?
- Do they compare the original and adjusted workout?
- Do they understand why the Priority Set was preserved?
- Do they choose Use Adjusted Workout, Make Changes, or Keep Original, and why?
- Any wrong turns, hesitation, backtracking, or requests for clarification.

### Post-task questions

- How easy or difficult was that task? **1 = very difficult, 7 = very easy.** Why?
- In your own words, what did SwimFlex change?
- Was it clear what stayed the same versus what changed?
- How confident would you be that the adjusted workout still serves the purpose of the original workout? **1-7.** Why?
- Was the explanation for the recommendation enough? What else would you want to know?
- Would you normally accept a recommendation like this, manually change it, or keep the original? Why?

---

## Task 2 — Adjust while already swimming

### Scenario

> You are in the main set: **6 × 200 Free @ 2:50**. After starting the set, the interval feels too difficult today. You would rate the effort around **RPE 8**. Adjust the workout so you can continue at a more appropriate interval.

### Starting state

Prepare the Tuesday Threshold workout in Pool Mode and place the session at the main set before beginning the task. Use the same starting rep/state for every participant. Show the smartwatch simulator as available, but do not require a specific device unless comparing interfaces is part of the test.

### Observe

- What information do they look at first in Pool Mode?
- Can they identify what they are currently swimming?
- Do they understand the interval and next send-off information?
- Do they find Quick Adjust without prompting?
- Do they understand the RPE input?
- Do they understand the proposed change from **2:50 to 3:00**?
- Do they notice that the workout pauses during adjustment and resumes afterward?
- If phone and smartwatch are both visible, which do they naturally prefer?
- Any controls or labels that feel too small, secondary, or unnecessary for pool use.

### Post-task questions

- How easy or difficult was that task? **1-7.** Why?
- Imagine you were wet, tired, and between reps. What information would you need to see immediately?
- Rank these from most to least important during a set:
  - distance/stroke to swim now
  - interval
  - next send-off countdown
  - current rep
  - set name/focus
  - elapsed workout time
  - what comes next
- Would you rather make this adjustment on a **phone, smartwatch, or either one depending on the situation**? Why?
- Is RPE a reasonable way to tell the system that the set is too difficult? What would you use instead?
- Would changing only the interval feel like the right response here?

---

## Task 3 — Adapt to an unexpected pool condition

### Scenario

> You arrive expecting a **25-yard pool**, but the available lap space is a **20-yard pool**. Adapt the planned workout for the pool that is actually available. Review the result and decide whether you would use it.

### Starting state

Return to the same canonical Tuesday Threshold workout before the task.

### Observe

- Can the participant identify the appropriate adaptation reason?
- Do they understand the 25-yard to 20-yard pool input?
- Do the changed distances make sense to them?
- Do they use the original-vs-adjusted comparison?
- Do they trust the recommendation or want manual control?
- Does this scenario feel like something they would encounter in real life?

### Post-task questions

- How easy or difficult was that task? **1-7.** Why?
- Did the pool-length adaptation make sense to you?
- Would you want SwimFlex to handle this automatically, suggest changes for you to approve, or leave it entirely manual?
- How likely is this type of adaptation to be useful to you personally? **1-7.** Why?

---

## Overall concept/usefulness interview

Ask these after all three scenarios, once the participant understands the concept.

1. Now that you have seen the full concept, how compelling is SwimFlex to you? Why?
2. How would you describe SwimFlex to another swimmer?
3. How well does it solve the problem of adapting a structured workout when today's circumstances are different from what was planned?
4. Which part would be most useful to you: pre-workout adaptation, in-workout Quick Adjust, smartwatch interaction, or something else?
5. Which adaptation situations would you realistically use?
   - less time
   - fatigue/readiness
   - workout too difficult
   - missing equipment
   - different pool length or pool limitation
   - pain/injury safety boundary
6. Which of those would you probably never use? Why?
7. What would make you trust an adjusted workout recommendation?
8. What would make you distrust one?
9. How much explanation do you want before accepting an adjusted workout?
10. Did the original-vs-adjusted comparison give you enough information to decide?
11. What parts were confusing or unclear?
12. What stands out as especially useful or well designed?
13. What concerns you about the concept?
14. If SwimFlex were a finished app, how eager would you be to use it? **1-7.** Why?
15. What is the single most important change you would make before using it regularly?

---

## Moderator notes to capture for each participant

For each task record:

- completed independently / completed with help / not completed
- first action
- wrong turns or dead ends
- places where participant hesitated
- participant quotes
- usability issue severity if applicable:
  - Severe; must fix
  - Major problem
  - Minor problem
  - Cosmetic/prototype issue
  - New feature request
- ease rating (1-7)
- confidence/usefulness ratings where asked

Also record the participant's swimming background and enough context to confirm they fit the target-user criteria used for the capstone.

## Important testing rule

Do not revise the prototype between participants simply because one participant dislikes something. Keep the prototype and task wording consistent so patterns can be compared across all five participants. Only fix something mid-study if it prevents participants from completing the evaluation at all; document any such change.
