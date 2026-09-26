import { practiceExercise, type Exercise, type Grade, type Skill } from './model';
import { curriculum } from './curriculum';

type NewWorkTool = Exercise['tool'];
const toolSkills: Record<NewWorkTool, [Skill, Skill]> = {
  'sentence-surgery': ['accuracy', 'understanding'],
  'sentence-upgrades': ['vocabulary', 'accuracy'],
  vocabulary: ['vocabulary', 'understanding'],
  'writers-effect': ['effect', 'evidence'],
  evidence: ['understanding', 'evidence'],
  'micro-writing': ['audience', 'structure'],
  'timed-writing': ['structure', 'audience'],
};
const responseFields: Record<NewWorkTool, Exercise['fields']> = {
  'sentence-surgery': [
    {
      id: 'response',
      label: 'Repaired passage',
      hint: 'Keep the original meaning. There can be more than one valid repair.',
    },
  ],
  'sentence-upgrades': [
    {
      id: 'response',
      label: 'Your rewrite',
      hint: 'Make deliberate changes. Longer is not automatically better.',
    },
    {
      id: 'reason',
      label: 'Explain a choice',
      hint: 'Compare one original phrase with your replacement.',
    },
  ],
  vocabulary: [
    {
      id: 'meaning',
      label: 'Meaning in context',
      hint: 'Use your own words to explain the specified word or phrase.',
    },
    {
      id: 'clue',
      label: 'Context clue',
      hint: 'Identify a detail that supports your interpretation.',
    },
    {
      id: 'response',
      label: 'Word choice',
      hint: 'Complete the word-choice part of the instructions and justify it.',
    },
  ],
  'writers-effect': [
    {
      id: 'evidence',
      label: 'Exact words',
      hint: 'Copy only the short phrase or phrases you will discuss.',
    },
    {
      id: 'response',
      label: 'Meaning and effect',
      hint: 'Explain the associations and impression in this scene. A device name alone is not analysis.',
    },
  ],
  evidence: [
    {
      id: 'response',
      label: 'Your response',
      hint: 'Follow the task: use evidence for an interpretation, or your own words for a summary.',
    },
  ],
  'micro-writing': [
    {
      id: 'response',
      label: 'Your writing',
      hint: 'Write for the audience and purpose given. Use the target as a guide.',
    },
  ],
  'timed-writing': [
    {
      id: 'response',
      label: 'Your writing',
      hint: 'Use your plan, develop the response and leave time to proofread.',
    },
  ],
};

function task(
  grade: Grade,
  tool: NewWorkTool,
  slug: string,
  title: string,
  genre: string,
  instructions: string,
  passage: string,
  example: Exercise['example'],
  criterion: string,
  fields?: Exercise['fields'],
): Exercise {
  const sustained = tool === 'timed-writing';
  const shortWriting = tool === 'micro-writing';
  const index = grade - 8;
  const target: [number, number] = sustained
    ? ([
        [180, 260],
        [250, 350],
        [300, 450],
      ][index] as [number, number])
    : shortWriting
      ? ([
          [90, 140],
          [120, 180],
          [160, 220],
        ][index] as [number, number])
      : ([
          [45, 100],
          [60, 130],
          [80, 160],
        ][index] as [number, number]);
  if (genre === 'Summary') {
    target[0] = [45, 70, 90][index];
    target[1] = [70, 100, 120][index];
  }
  const skills = toolSkills[tool];
  return practiceExercise({
    id: `g${grade}-${slug}`,
    version: 1,
    grade,
    tool,
    title,
    genre,
    instructions,
    passage,
    example,
    fields: fields ?? responseFields[tool].map((field) => ({ ...field })),
    criteria: [
      { skill: skills[0], description: criterion },
      { skill: skills[1], description: curriculum[grade].skills[skills[1]] },
    ],
    wordTarget: target,
    minutes: sustained
      ? [20, 25, 30][index]
      : shortWriting
        ? [10, 12, 15][index]
        : [7, 9, 11][index],
    source: 'curated',
  });
}

// All passages and examples below are original. Examples use different material from the task.
export const exercises: Exercise[] = [
  task(
    8,
    'sentence-surgery',
    'late-bus',
    'The late bus',
    'Narrative',
    'Repair the passage for a school story collection. Correct sentence boundaries, capitals and tense. Keep the events unchanged. Explain one correction.',
    'the bus was late Mira checks her watch. Her friends was waiting by the gate, they had already missed the first bell. When the bus finally arrived everyone climb aboard.',
    {
      prompt: 'Repair: the kite fell Leo picks it up.',
      response: 'The kite fell. Leo picked it up.',
      explanation:
        'A full stop separates the complete actions; picked keeps both actions in the past.',
    },
    'Use complete sentences, correct subject–verb agreement and a consistent past tense.',
  ),
  task(
    8,
    'sentence-surgery',
    'garden-notice',
    'A notice that makes sense',
    'Notice',
    'Rewrite this notice for student volunteers. Repair the sentence boundaries and the missing possessive and list punctuation. Keep every practical detail. Explain one correction.',
    'Our schools garden opens on Saturday bring gloves a hat and water. The tools is in the shed please return them before you leave. If it rains we will meet in Room 4.',
    {
      prompt: 'Repair: Our clubs walk starts at nine bring a coat boots and lunch.',
      response: 'Our club’s walk starts at nine. Bring a coat, boots and lunch.',
      explanation:
        'The apostrophe shows that the walk belongs to the club. The full stop separates instructions; commas separate items.',
    },
    'Use punctuation and agreement to make each instruction clear without changing its details.',
  ),
  task(
    8,
    'sentence-upgrades',
    'empty-platform',
    'Waiting on the platform',
    'Description',
    'Rewrite the scene for readers of a short story. Make the waiting feel uneasy through precise verbs and one sensory detail. Do not add a new event. Explain one choice.',
    'The platform was quiet. A light was making a noise. Arun looked at the clock. The train was not there. He felt nervous.',
    {
      prompt: 'Make a crowded kitchen feel busy: People moved. Pans made noise.',
      response: 'Elbows brushed past the doorway while pans clattered above the stove.',
      explanation: 'Brushed and clattered turn vague movement and noise into specific sensations.',
    },
    'Replace vague words with details that build unease while retaining the original situation.',
  ),
  task(
    8,
    'sentence-upgrades',
    'useful-instructions',
    'Make the directions useful',
    'Instructions',
    'Rewrite these instructions for someone using the library returns box for the first time. Remove vague words and repetition. Do not invent a rule or location. Explain one improvement.',
    'Go to the box by the library door. Take the thing that is your book and put the book through the hole at the top. Do it gently because you should not damage it. If the box is full, give the book to the librarian at the desk.',
    {
      prompt: 'Clarify: Do the thing with the cap, then put water in the bottle.',
      response: 'Unscrew the cap, then fill the bottle with water.',
      explanation:
        'Unscrew names the action. The shorter instruction removes words that do not help the reader.',
    },
    'Use precise actions and concise wording so a new visitor can follow the instructions.',
  ),
  task(
    8,
    'vocabulary',
    'reluctant-keeper',
    'A reluctant volunteer',
    'Narrative',
    'Explain what reluctant means here. Identify a context clue. Then choose willing, hesitant or careless to replace reluctant and explain why it fits better than one other option.',
    'When the coach asked for a goalkeeper, Ishan studied his shoes. He raised his hand only after everyone else stepped back. Our reluctant volunteer walked slowly towards the goal, asking whether someone could swap with him after five minutes.',
    {
      prompt: 'Infer brisk in: Nura set a brisk pace; we had to hurry to keep up.',
      response:
        'Brisk means quick and energetic here. Having to hurry is the clue. Speedy fits better than gentle because the sentence stresses pace.',
      explanation: 'The meaning is linked to a visible action instead of a memorised definition.',
    },
    'Infer reluctant from the character’s actions and distinguish hesitation from carelessness.',
  ),
  task(
    8,
    'vocabulary',
    'fragile-package',
    'Handle with care',
    'Report',
    'Explain fragile in this report and quote a context clue. Choose sturdy, delicate or costly as its closest replacement. Explain why price alone does not tell us whether an object is fragile.',
    'The museum assistant lifted the fragile model with both hands. One paper tower had bent during the journey, so she placed soft cloth around the base before carrying it across the room. A much heavier stone carving travelled without extra wrapping.',
    {
      prompt: 'Infer scarce in: Fresh water was scarce; each walker received only half a cup.',
      response:
        'Scarce means in short supply. The small amount given to each walker is evidence. Limited fits; dirty would describe quality, not amount.',
      explanation: 'The explanation separates the relevant meaning from another possible property.',
    },
    'Use the damaged paper tower to infer vulnerability, rather than guessing from the museum setting.',
  ),
  task(
    8,
    'writers-effect',
    'rain-on-roof',
    'Rain with a rhythm',
    'Description',
    'For a reader discussing this scene, select two short phrases about the rain. Explain what each suggests and how the rain’s changing sound affects the mood. Avoid retelling the whole passage.',
    'At first, rain tapped politely on the tin roof. Then a thousand small fists drummed overhead. Sana pulled her chair closer to the stove. Beyond the window, the lane dissolved into a trembling silver curtain.',
    {
      prompt: 'Explain: The old gate groaned when we pushed it.',
      response:
        'Groaned makes the gate sound tired and resistant, as if opening it costs an effort. It suggests age and makes the entrance feel unwelcoming.',
      explanation:
        'The response connects a word’s associations to this particular object and setting.',
    },
    'Explain the contrast between gentle tapping and forceful drumming using the chosen words.',
  ),
  task(
    8,
    'writers-effect',
    'first-morning',
    'The city wakes',
    'Description',
    'Choose two images that make the city seem alive. Explain their meaning and the impression they create for someone who has never visited this street.',
    'Shutters yawned open along the street. A baker shook flour from his sleeves, and warm bread breathed its sweetness into the cold. Soon bicycles threaded between the stalls, carrying the morning from one doorstep to the next.',
    {
      prompt: 'Explain: Sunlight spilled across the classroom floor.',
      response:
        'Spilled suggests light spreading freely, like liquid escaping a container. It makes the classroom seem suddenly filled with warmth.',
      explanation: 'The image is explained rather than only labelled as a metaphor.',
    },
    'Connect exact images to the street’s growing activity and welcoming or lively atmosphere.',
  ),
  task(
    8,
    'evidence',
    'saved-seat',
    'The saved seat',
    'Narrative',
    'Is Farah pleased that Dev has arrived? Write a supported inference for a class discussion. Use two details and explain why her words alone might give a different impression.',
    'Farah slid her bag off the bench as soon as she saw Dev. “You took your time,” she said, looking towards the field. Beside her lay two paper cups of lemonade. When Dev sat down, she pushed the fuller cup towards him without turning her head.',
    {
      prompt:
        'Infer a feeling: Toma said he did not mind losing, but folded the score sheet into smaller and smaller squares.',
      response:
        'Toma may be disappointed despite his words. Repeatedly folding the score sheet suggests restless frustration linked to the result.',
      explanation:
        'The inference recognises a contrast and remains cautious about a feeling the text does not state.',
    },
    'Support a plausible inference with actions and objects, while recognising the contrast with Farah’s words.',
  ),
  task(
    8,
    'evidence',
    'refill-station',
    'A useful summary',
    'Summary',
    'Summarise the benefits and practical problems of the refill station for a school newsletter. Use your own words, include both sides and omit decorative details. Aim for 45–70 words.',
    'A new water station stands beside the painted mural near the sports hall. Students can refill bottles free of charge, so fewer disposable bottles reach the bins. The water stays cool even after lunch. However, the queue blocks the narrow corridor at break, and younger pupils struggle to press the stiff tap. The caretaker is testing a softer handle and a second queue beside the wall.',
    {
      prompt:
        'Summarise: The blue book trolley travels to classrooms. It saves pupils a trip downstairs, but its squeaky wheels interrupt lessons.',
      response:
        'The mobile book service saves pupils time, but noise from its wheels can disturb classes.',
      explanation: 'The summary retains a benefit and a problem but omits the colour.',
    },
    'Select the station’s benefits and problems, group them clearly and avoid copying or adding opinions.',
  ),
  task(
    8,
    'micro-writing',
    'unexpected-key',
    'A key in the envelope',
    'Narrative',
    'Write a short scene for readers your age. Begin just after this moment. Show the narrator’s curiosity through actions and one line of dialogue. End with a decision, not a complete solution.',
    'The envelope contained no letter, only a tiny brass key. On its paper label, someone had written the name of our old street.',
    {
      prompt: 'Show surprise when a character finds a feather in a textbook.',
      response:
        'Ravi held the page half open. “Was that here yesterday?” He lifted the feather by its tip and checked the window latch.',
      explanation:
        'A paused action and a question show surprise without simply naming the feeling.',
    },
    'Engage a peer reader with a clear viewpoint, purposeful detail and a decision that follows from the discovery.',
  ),
  task(
    8,
    'micro-writing',
    'welcome-letter',
    'Welcome to the club',
    'Letter',
    'Write a welcoming letter to a nervous new member of the school nature club. Explain what happens at the first meeting, offer one practical tip and reassure them without making promises you cannot keep.',
    'The club meets on Wednesdays in Room 6. First meetings include a ten-minute walk in the courtyard and sketching one leaf. Students may work alone or in pairs. Materials are supplied, but members should bring water.',
    {
      prompt: 'Welcome a beginner to a chess group.',
      response:
        'Dear Alex, You do not need to know every rule. At your first meeting, you can watch a short game before choosing whether to join one.',
      explanation:
        'A concrete choice is more reassuring than an unsupported promise that everything will be easy.',
    },
    'Use a friendly letter voice and accurate practical information to address the new member’s concern.',
  ),
  task(
    8,
    'timed-writing',
    'quiet-corner',
    'A place to read',
    'Speech',
    'Write a speech for your year-group meeting proposing a quiet reading corner. Use the information, explain a benefit and address a practical concern. Plan for 3 minutes, write for 14 and proofread for 3.',
    'The covered area beside the hall is unused at lunch. The school can lend twelve chairs and a box of books, but no staff member can supervise it every day. Some students prefer talking there when it rains. The student council may trial a proposal for two weeks.',
    {
      prompt: 'Open a speech proposing a lunchtime drawing table.',
      response:
        'At lunch, some of us want a conversation and something to make. A drawing table could give us both, provided we leave enough space for people to eat.',
      explanation:
        'The opening gives a reason and recognises another group’s needs without exaggeration.',
    },
    'Organise a clear proposal with a relevant benefit, a workable response to a concern and a suitable ending.',
  ),
  task(
    8,
    'timed-writing',
    'market-after-rain',
    'After the rain',
    'Description',
    'Write a descriptive piece for a school magazine about the market reopening after rain. Use the scene notes, a clear viewpoint and changes in sound or movement. Do not turn the piece into a large adventure. Plan for 3 minutes, write for 14 and proofread for 3.',
    'You stand beneath a canvas awning. Rain has stopped. Puddles reflect the stall lights. A fruit seller uncovers a crate; a delivery cyclist waits for a gap; someone shakes water from a folded umbrella.',
    {
      prompt: 'Describe a swimming pool just before it opens.',
      response:
        'The water held the ceiling lights perfectly still. Then a cleaner dragged a bucket across the tiles, and the empty room returned the sound twice.',
      explanation: 'Two selected details establish stillness and then disturb it through sound.',
    },
    'Arrange sensory details around one viewpoint and develop a clear change from stillness to activity.',
  ),
  task(
    9,
    'sentence-surgery',
    'exhibition-report',
    'An exhibition report',
    'Report',
    'Repair this report for the school website. Correct agreement, sentence boundaries and the tense sequence. Keep the facts and explain a correction that changes clarity.',
    'By the time the doors opened, the art group has hung every picture. Each of the visitors were given a map, several maps had the wrong room numbers. Although the signs were clear. Two families misses the sculpture room before a guide redirected them.',
    {
      prompt:
        'Repair: Before the concert began, the drummer has tested each microphone, they all worked.',
      response:
        'Before the concert began, the drummer had tested each microphone. They all worked.',
      explanation:
        'Had tested places the check before the past event. A full stop repairs the comma splice.',
    },
    'Control past-perfect sequencing, agreement and sentence boundaries while keeping the report’s meaning.',
  ),
  task(
    9,
    'sentence-surgery',
    'canteen-petition',
    'A clear petition',
    'Argument',
    'Edit the paragraph for a petition to the headteacher. Repair the dangling opening, agreement, possessive punctuation and sentence boundary. Keep the qualified claim about cost. Explain one repair.',
    'Walking into the canteen, the lack of seats is obvious to students. The benches near the windows is often full. Students bags occupy the remaining chairs this could be reduced by adding hooks. Hooks may cost less than new furniture, although no prices have been checked.',
    {
      prompt: 'Repair: Looking through the telescope, the moon seemed enormous to Niko.',
      response: 'Looking through the telescope, Niko thought the moon seemed enormous.',
      explanation:
        'The revised subject is the person looking. It removes the suggestion that the moon uses the telescope.',
    },
    'Remove the misleading opening and grammatical errors without turning a tentative cost claim into a fact.',
  ),
  task(
    9,
    'sentence-upgrades',
    'rescue-report',
    'Precision without drama',
    'News report',
    'Rewrite for a local news website. Remove inflated wording and vague claims while retaining the verified facts. Use a measured tone and explain one change.',
    'In an absolutely unbelievable event, a truly massive branch came down in the park at 4 pm. It was a terrible nightmare for everybody. The path was blocked for forty minutes. Two park workers moved the branch, and nobody was injured.',
    {
      prompt:
        'Make this measured: A mind-blowing crowd of 46 people invaded the bookshop for a signing.',
      response: 'Forty-six people attended the bookshop signing.',
      explanation:
        'The count supplies useful evidence; invaded and mind-blowing add unsupported drama.',
    },
    'Use verified details and neutral verbs to inform readers without exaggerating danger or scale.',
  ),
  task(
    9,
    'sentence-upgrades',
    'hill-climb',
    'Shape the pace',
    'Narrative',
    'Rewrite the scene for a story, varying sentence length to move from a difficult climb to a sudden discovery. Keep the viewpoint and events. Explain how one sentence choice controls pace.',
    'I climbed the hill. The path was steep. My bag was heavy. I stopped at the top. There was a light in the abandoned house. I had thought nobody lived there.',
    {
      prompt: 'Slow a scene, then reveal an absence: She checked each shelf. The jar was gone.',
      response:
        'She checked the shelves one by one, moving tins aside and lifting the folded cloth. No jar.',
      explanation: 'The extended search delays the short discovery, making the absence stand out.',
    },
    'Use sentence variety and precise detail to control pace without adding unrelated events.',
  ),
  task(
    9,
    'vocabulary',
    'measured-response',
    'A measured response',
    'Interview',
    'Explain measured as used here and identify a clue. Then explain how replacing it with indifferent would change the reader’s view of the organiser.',
    'Asked about the cancelled festival, the organiser gave a measured response. She paused before answering, accepted that visitors had been disappointed and explained which refunds were already being processed. She did not blame the volunteers or promise a new date before the field had been inspected.',
    {
      prompt: 'Distinguish firm from hostile in a description of a referee.',
      response:
        'Firm suggests clear limits held steadily; hostile suggests antagonism. A referee who calmly repeats a rule may be firm without being hostile.',
      explanation:
        'The comparison explains the attitude each word adds, not just a dictionary synonym.',
    },
    'Infer a controlled, considered response and explain how indifferent would add an unsupported lack of concern.',
  ),
  task(
    9,
    'vocabulary',
    'tentative-route',
    'A tentative route',
    'Travel journal',
    'Explain tentative and narrow in their contexts. Give a clue for each. Then choose provisional or timid to replace tentative and justify your choice using the situation.',
    'Our route was tentative: the ranger would confirm it after checking the river level. The bridge offered only a narrow margin of safety once the water rose. We marked a longer path on the map as a backup, though it would add two hours to the walk.',
    {
      prompt:
        'Explain thin in: The evidence for the rumour was thin; only one unnamed person claimed to have seen it.',
      response:
        'Thin means weak or insufficient here, rather than physically narrow. The single unnamed witness makes the claim hard to check.',
      explanation:
        'The response distinguishes figurative meaning from the everyday physical meaning.',
    },
    'Distinguish uncertainty in a plan from a person’s fear and interpret a figurative margin of safety.',
  ),
  task(
    9,
    'writers-effect',
    'closed-factory',
    'The silent factory',
    'Literary description',
    'Analyse two or three short language choices that present the abandoned factory. Explain how they work together, including the contrast with its working past. Write for a reader who knows the passage.',
    'The machines stood shoulder to shoulder, an army with no orders. Once, the windows had rattled to their rhythm; now a loose sheet of metal clicked in the wind. Dust softened every sharp edge, as though the building were slowly forgetting its own shape.',
    {
      prompt:
        'Analyse: The theatre swallowed our whispers; its empty seats faced us like patient judges.',
      response:
        'Swallowed makes the room seem powerful enough to erase small sounds. Patient judges gives the empty seats a watchful authority, making the visitors feel exposed despite being alone.',
      explanation:
        'The two images build a connected interpretation of the place’s effect on its visitors.',
    },
    'Explain how stillness, residual sound and personification combine to suggest lost purpose or gradual decay.',
  ),
  task(
    9,
    'writers-effect',
    'sales-pitch',
    'The language of a promise',
    'Advertisement',
    'Analyse how the advertisement tries to make a repair service seem reassuring. Select two or three exact choices. Explain the intended appeal and one limit to what the wording proves.',
    'A cracked screen need not crack your day. Leave your phone with a neighbour who knows its smallest screws. Our technicians give every device a careful second chance. No jargon. No raised eyebrows. Just a clear price before work begins.',
    {
      prompt: 'Analyse a bakery slogan: A warm welcome in every loaf.',
      response:
        'Warm links the bread’s physical temperature with friendly treatment. Every suggests consistency, but the slogan alone cannot prove the quality of each loaf.',
      explanation: 'The analysis separates persuasive associations from factual evidence.',
    },
    'Connect friendly language and short assurances to trust, while distinguishing a promise from proof.',
  ),
  task(
    9,
    'evidence',
    'phone-policy',
    'What does the trial show?',
    'Evaluation',
    'Evaluate the claim that the phone-box trial improved every lesson. Use the report’s evidence and identify a limitation. Give a qualified conclusion for the student council.',
    'For one week, two classes placed phones in a box at the start of lessons. Four teachers reported fewer interruptions. Three students said they could concentrate better; two said they worried about messages from home. No lesson observations were made before the trial, and one class was studying for a test that week. The report concludes: “Phone boxes improved every lesson.”',
    {
      prompt: 'Evaluate: A café sold all its new soup on Friday, so everyone in town loves it.',
      response:
        'Selling out suggests demand among that day’s customers, but it does not show what everyone in town thinks. The number of portions and the views of non-buyers are unknown.',
      explanation: 'The conclusion is limited to what the available evidence can support.',
    },
    'Separate evidence of some benefit from a universal claim and explain why the missing comparison matters.',
  ),
  task(
    9,
    'evidence',
    'repair-cafe',
    'Summarise the repair café',
    'Summary',
    'In 70–100 words, summarise why people use the repair café and what limits its service. Write for a resident deciding whether to visit. Use your own words and omit the history and decoration.',
    'The repair café began in a former bakery with yellow window frames. Volunteers help residents mend small appliances and clothing without charging for labour. Visitors learn simple techniques and meet neighbours while waiting. The service reduces waste when repairs succeed. However, specialist parts must be bought by visitors, and volunteers cannot guarantee a repair. There is no storage space for large furniture. On busy Saturdays, jobs are limited to twenty minutes so that more people get a turn. The founder used to repair bicycles as a child.',
    {
      prompt: 'Summarise why a walking group is useful and what restricts access.',
      response:
        'The group offers company and local route knowledge, but its weekday schedule excludes some workers and several paths are unsuitable for wheelchairs.',
      explanation:
        'Related benefits and restrictions are grouped instead of listed in the source’s original order.',
    },
    'Select and group practical benefits and limits without irrelevant detail, copied phrases or invented advice.',
  ),
  task(
    9,
    'micro-writing',
    'museum-label',
    'An object with two stories',
    'Article',
    'Write a short article for the school history magazine about this object. Explain why an ordinary object can carry different meanings. Use both accounts, keeping fact and interpretation distinct.',
    'Object: a dented lunch tin, donated by a retired railway worker. The worker says it recalls rushed meals and long shifts. Her daughter remembers the same tin bringing leftover festival sweets home. The museum has no record of when the dent appeared.',
    {
      prompt: 'Write about a faded team scarf described by two owners.',
      response:
        'To its first owner, the scarf recalls a freezing defeat. To his brother, who received it years later, it marks the first match they attended together. Its value does not depend on a winning score.',
      explanation:
        'The object links contrasting memories without inventing an explanation for its physical condition.',
    },
    'Write an engaging article that respects both memories and does not invent a history for the dent.',
  ),
  task(
    9,
    'micro-writing',
    'unreliable-journal',
    'What the narrator leaves out',
    'Journal',
    'Write a journal entry after the incident. Let the narrator defend taking the shortcut while unintentionally revealing some responsibility. Keep the account understandable; do not make every statement false.',
    'During a sponsored walk, you persuaded two friends to leave the marked route. You arrived late at the checkpoint. A volunteer spent twenty minutes looking for your group, and one friend missed the return bus.',
    {
      prompt: 'A narrator defends returning a borrowed comic late.',
      response:
        'It was only four days, and I had kept it perfectly flat. I did not mention the juice mark when I handed it back; it was on an advertisement, after all.',
      explanation:
        'The excuse exposes the narrator’s priorities and lets readers infer more than the narrator admits.',
    },
    'Sustain a believable defensive voice while giving readers concrete evidence of the narrator’s responsibility.',
  ),
  task(
    9,
    'timed-writing',
    'weekend-library',
    'Open on Sundays?',
    'Argumentative article',
    'Write an article for the town newsletter arguing whether the library should open on Sundays. Use the source fairly, develop your position and answer a counterargument. Plan for 4 minutes, write for 17 and proofread for 4.',
    'The library currently closes on Sundays. Students and shift workers have requested weekend study space. The manager says an extra day needs either more funding or shorter hours elsewhere. A survey of 80 current visitors found 52 in favour, but it did not include residents who never visit. A nearby community hall is free on Sunday afternoons but has no book collection or computers.',
    {
      prompt: 'Respond to a counterargument about a school vegetable plot.',
      response:
        'Watering in the holidays is a real concern. A smaller plot beside the caretaker’s regular route could reduce the burden, but it should not go ahead without a volunteer rota.',
      explanation:
        'The argument answers a practical objection and makes the proposal conditional rather than dismissing it.',
    },
    'Develop a coherent position, address the staffing trade-off and avoid treating a limited survey as the whole town’s view.',
  ),
  task(
    9,
    'timed-writing',
    'last-rehearsal',
    'The last rehearsal',
    'Narrative',
    'Write a story for a youth anthology in which a rehearsal changes a relationship. Use the starting situation, develop a turning point and give the ending space. Plan for 4 minutes, write for 17 and proofread for 4.',
    'The lead actor has lost their voice an hour before the final rehearsal. The quiet student who controls the sound desk knows every line, but the two students have argued all week about who does the real work.',
    {
      prompt: 'Create a turning point between rival runners.',
      response:
        'At the broken gate, Leena stopped checking her watch. She held the wire aside until her rival crawled through, then waited for him to stand before running again.',
      explanation:
        'A choice changes the relationship through action instead of a speech explaining the lesson.',
    },
    'Build a credible turning point from the established conflict and control the balance of action, dialogue and ending.',
  ),
  task(
    10,
    'sentence-surgery',
    'survey-conclusions',
    'What the survey can say',
    'Formal report',
    'Edit for a council report. Correct agreement, parallel structure and sentence boundaries. Preserve the uncertainty and make the final pronoun’s reference explicit. Explain a repair that improves meaning.',
    'Neither the interviews nor the questionnaire prove that all residents support the plan. The committee recommends widening the pavement, to improve lighting and a review of delivery hours. Traders were consulted after residents, they raised concerns about access. In the last sentence, the writer means the traders raised those concerns.',
    {
      prompt: 'Repair: The panel proposes reducing noise, safer crossings and to plant trees.',
      response: 'The panel proposes reducing noise, making crossings safer and planting trees.',
      explanation:
        'Parallel verb forms show three coordinated proposals and remove a change in grammatical pattern.',
    },
    'Control parallelism, agreement and reference while preserving the source’s cautious conclusion.',
  ),
  task(
    10,
    'sentence-surgery',
    'ambiguous-review',
    'Who made the decision?',
    'Review',
    'Edit this review for publication. Make the agent of the opening action and the pronoun reference clear. Correct the misplaced only, using the note to preserve its intended meaning. Explain two repairs.',
    'Having watched the final scene, the ending seemed rushed. The director told the producer that she should cut the music, which annoyed her. The reviewer only praised the lighting at the afternoon performance. Notes: the reviewer watched the scene; the director wanted the producer to cut the music; the producer was annoyed; lighting was the sole feature praised.',
    {
      prompt: 'Clarify: The tutor told the pupil he had arrived late. The tutor was late.',
      response: 'The tutor told the pupil, “I arrived late.”',
      explanation:
        'Direct speech identifies who arrived late; the repair uses the supplied meaning rather than guessing.',
    },
    'Resolve ambiguous agency, reference and modifier scope using the notes, without adding a new judgement.',
  ),
  task(
    10,
    'sentence-upgrades',
    'restrained-grief',
    'Leave room for the reader',
    'Literary narrative',
    'Rewrite the scene for a short-story anthology. Replace repeated statements of emotion with selected actions or details. Keep a restrained voice and the same events. Explain the effect of one omission.',
    'I was extremely sad when I entered my grandfather’s workshop. I felt terrible because he was gone. His coat was on the hook. His pencil was beside the unfinished bird he had carved. I felt very upset and closed the door quietly.',
    {
      prompt: 'Suggest homesickness without naming it: I missed home at dinner.',
      response:
        'I turned the bowl until its chipped edge faced me, as it always had at our kitchen table. Here, nobody noticed.',
      explanation:
        'A familiar habit in an unfamiliar place carries the feeling without an explicit emotional label.',
    },
    'Use precise detail and restraint to suggest loss, avoiding inflated language and invented events.',
  ),
  task(
    10,
    'sentence-upgrades',
    'balanced-recommendation',
    'A recommendation with limits',
    'Policy report',
    'Rewrite for governors making a funding decision. Remove absolute claims, retain the evidence and make the recommendation clear but conditional. Explain how one change improves credibility.',
    'The tutoring scheme is obviously a complete triumph and must definitely be expanded immediately. Nine of the twelve participants improved their quiz scores after six weeks. There was no comparison group. Participants also had extra revision materials. Staff can support six more places if one afternoon meeting is moved.',
    {
      prompt:
        'Refine: The new crossings have completely solved traffic danger; three near misses were reported this term, compared with seven last term.',
      response:
        'Reported near misses fell from seven to three after the crossings opened. This is encouraging, although it does not establish that the crossings alone caused the change.',
      explanation:
        'The revision preserves the useful comparison while removing an unsupported causal certainty.',
    },
    'Express a proportionate recommendation that recognises the small sample, other support and staffing condition.',
  ),
  task(
    10,
    'vocabulary',
    'sanction-dispute',
    'When a word has two meanings',
    'News analysis',
    'Explain sanction in each sentence. Identify the grammatical or contextual clue that distinguishes the meanings. Then replace both uses with clearer wording for a younger reader, preserving the facts.',
    'The committee will sanction the evening market only if emergency access remains clear. A trader who repeatedly blocks the access lane may face a sanction. Permission will be reviewed after the first month, and any penalty can be appealed.',
    {
      prompt:
        'Explain oversight in: Her oversight left a name off the list. The board provides oversight of the project.',
      response:
        'The first oversight is an accidental omission; the missing name is the clue. The second means supervision, supported by the board’s responsibility for the project.',
      explanation:
        'The surrounding action determines the meaning of the same word in each sentence.',
    },
    'Resolve the contrasting meanings through context and grammar, then paraphrase without losing the conditions.',
  ),
  task(
    10,
    'vocabulary',
    'concession-tone',
    'Concession or dismissal?',
    'Editorial',
    'Explain nominal and concede in context. Then discuss how replacing concede with admit would subtly change the tone. Support your view with the surrounding argument; reasonable distinctions are welcome.',
    'The council describes the entry charge as nominal, yet a family visiting twice a week would pay a substantial monthly total. Supporters concede that frequent visitors will notice the cost, but argue that the income will keep the pool open through winter. No reduced family rate has yet been proposed.',
    {
      prompt: 'Compare frugal and miserly for someone who rarely spends money.',
      response:
        'Frugal often approves careful spending; miserly criticises an unwillingness to spend. Neither can be chosen fairly from the amount spent alone: the reasons and consequences matter.',
      explanation:
        'The comparison addresses connotation while recognising that context can alter the judgement.',
    },
    'Explain scale and concession in this argument and justify a nuanced account of the proposed word change.',
  ),
  task(
    10,
    'writers-effect',
    'return-to-harbour',
    'A changed harbour',
    'Memoir',
    'Analyse how language presents the narrator’s mixed response to the changed harbour. Explore three precise choices, including a shift or contrast. Allow for ambiguity rather than assigning one simple emotion.',
    'The harbour wore its new glass buildings like borrowed jewellery. I searched for the fish shed and found a café serving nostalgia in enamel cups. Yet children leaned over the clean railings, following silver flickers below, and the old tide still shouldered its way between the piles. I stayed longer than I had intended.',
    {
      prompt:
        'Analyse mixed feelings: The new station gleamed; I missed the old clock’s stubborn, inaccurate face.',
      response:
        'Gleamed acknowledges the new station’s polish, while stubborn gives the faulty clock a character the narrator values. Inaccurate concedes its weakness, so affection is not the same as claiming the old station worked better.',
      explanation:
        'The analysis preserves tension between practical improvement and emotional attachment.',
    },
    'Analyse the tension between artificial display, commercialised memory and continuing life without flattening the narrator’s response.',
  ),
  task(
    10,
    'writers-effect',
    'progress-speech',
    'Progress, according to whom?',
    'Speech',
    'Analyse how the speaker frames opposition to a road proposal. Select three language choices and explain their associations or rhetorical pressure. Distinguish the speaker’s intended effect from what every listener must think.',
    'We can keep polishing yesterday’s map, or we can give this town a road into tomorrow. I respect those who love the old orchard. But affection cannot carry an ambulance through a traffic jam. Let us plant new trees, yes, and let us also plant the courage to move.',
    {
      prompt: 'Analyse: Are we building a school, or merely a larger waiting room?',
      response:
        'The either-or question pushes listeners towards the speaker’s preferred idea of education. Merely belittles the alternative, although the comparison may exclude more balanced options.',
      explanation:
        'The response explains rhetorical pressure without assuming all listeners accept it.',
    },
    'Explain how metaphor, concession and contrast frame the choice, including a possible oversimplification.',
  ),
  task(
    10,
    'evidence',
    'rooftop-garden',
    'Two accounts of one project',
    'Source synthesis',
    'Evaluate whether the rooftop garden should be expanded. Synthesise both accounts, distinguish measured results from impressions and identify one important unanswered question. Write for the building committee.',
    'Source A, project coordinator: “The pilot harvested 38 kilograms of vegetables in ten weeks. Sixteen households volunteered, and the roof is now a place where neighbours talk. We should double the growing area.” Source B, maintenance log: “Water use increased during the pilot, but the meter also serves roof cleaning. Two leaks were repaired; their cause was not established. The caretaker spent three additional hours each week on garden tasks. No load assessment for an expanded garden has been completed.”',
    {
      prompt:
        'Weigh two sources on a cycling scheme: the organiser reports 20 new riders; a mechanic records repeated brake faults.',
      response:
        'The new riders suggest uptake, but safety faults weaken the case for immediate expansion. Repairing and checking the bicycles should precede growth; participation alone does not establish that the scheme is safe.',
      explanation:
        'The sources inform a conditional judgement rather than two disconnected summaries.',
    },
    'Weigh quantified benefits and operational limits, avoid assigning unproven causes and justify a conditional judgement.',
  ),
  task(
    10,
    'evidence',
    'mobile-health-library',
    'Summarise across sources',
    'Summary',
    'In 90–120 words, synthesise how the mobile library improves access and what barriers remain. Use both sources, combine overlapping ideas and write in your own words. Do not evaluate the service or add outside facts.',
    'Source A, librarian: The van visits four villages without permanent libraries. Residents can reserve books by telephone and collect them locally. Large-print books are popular. The van has steps and no lift, so staff carry books outside for visitors who cannot enter. Source B, resident survey: Respondents value avoiding the expensive bus journey to town. Several want evening stops because the van comes during working hours. Two villages receive visits only once a month. Phone reservations help residents without internet access, but the catalogue is currently available only online.',
    {
      prompt:
        'Combine sources: One says a food stall uses reusable boxes; another says this reduces litter but returning boxes is inconvenient.',
      response:
        'Reusable boxes reduce waste, though the need to return them can inconvenience customers.',
      explanation:
        'The repeated point is stated once and linked directly to the remaining barrier.',
    },
    'Integrate access benefits and remaining barriers from both sources without duplication, inference or judgement.',
  ),
  task(
    10,
    'micro-writing',
    'public-apology',
    'An apology that takes responsibility',
    'Formal letter',
    'Write a letter to residents on behalf of a student events team. Acknowledge the specific problem, accept your team’s responsibility and propose a realistic next step. Use a respectful tone without evasive phrases or unsupported promises.',
    'Your team’s outdoor film screening ran 35 minutes beyond the published finish time because setup started late. Residents had complained about the volume before the screening ended. The team controls scheduling and speaker placement but cannot approve future event permits. A meeting with residents is available next Thursday.',
    {
      prompt: 'Take responsibility for a club’s missing booking.',
      response:
        'We failed to confirm your room booking, so your group arrived without a space to meet. I am sorry. I will send the written confirmation for the replacement date by Friday.',
      explanation:
        'The apology identifies the failure, its consequence and an action within the writer’s control.',
    },
    'Accept specific responsibility and propose action within the team’s authority, sustaining a respectful formal voice.',
  ),
  task(
    10,
    'micro-writing',
    'two-viewpoints',
    'One place, two viewpoints',
    'Description',
    'Write two linked paragraphs about the same empty fairground: first from a caretaker’s viewpoint, then from someone returning after many years. Keep the physical facts consistent but change selection, diction and emphasis. Do not label the emotions.',
    'The fairground is closed for winter. A loose gate rattles. Rain collects beneath the ticket booth. Faded horses stand on the covered carousel. One work light remains on beside a toolbox.',
    {
      prompt: 'Describe the same scratched kitchen table through a restorer and a former owner.',
      response:
        'The restorer followed the deep scratch against the grain and tested the loose leg. Its former owner traced the mark where a birthday candle had toppled, then sat at the shortest side out of habit.',
      explanation:
        'The same physical object supports practical attention and personal memory through selected details.',
    },
    'Create two distinct viewpoints through diction and focus while preserving a coherent shared setting.',
  ),
  task(
    10,
    'timed-writing',
    'archive-decision',
    'Whose archive is it?',
    'Report',
    'Write a report to the town heritage committee recommending how to make the archive more accessible. Synthesise both sources, evaluate the trade-offs and give a feasible priority. Do not invent costs or consent. Plan for 5 minutes, write for 20 and proofread for 5.',
    'Source A, archivist: The reading room opens two mornings a week. Digitising selected photographs could reach distant residents and reduce handling of fragile originals. Staff can scan about fifty items per week. Several collections include letters donated under privacy restrictions. Source B, community group: Older residents want longer opening hours and help identifying people in photographs. Some have limited internet access. Volunteers offer to record descriptions, but they need training. A searchable website would help schools, provided uncertain dates and disputed identifications remain clearly marked.',
    {
      prompt: 'Recommend a first step for a local oral-history project with limited equipment.',
      response:
        'Begin with a small set of consented interviews and train volunteers to record dates and permissions consistently. This limits the first release but avoids creating a larger collection that cannot be responsibly shared.',
      explanation:
        'The recommendation links a practical limit to a clear priority and acknowledges its cost.',
    },
    'Organise an evidence-based recommendation that balances digital access, in-person needs, capacity and privacy restrictions.',
  ),
  task(
    10,
    'timed-writing',
    'shared-courtyard',
    'A shared courtyard',
    'Persuasive speech',
    'Write a speech to a residents’ meeting recommending how the shared courtyard should be used. Represent competing needs fairly, develop a reasoned proposal and address its strongest objection. Use the source without inventing support. Plan for 5 minutes, write for 20 and proofread for 5.',
    'Some residents request a play area because the nearest park is a long walk away. Others need a quiet place to rest after night shifts. The courtyard is the only step-free route to two flats, and that access must remain clear. There is funding for movable seats or a small set of play equipment, not both. A four-week trial with existing furniture is possible. No vote or noise survey has yet taken place.',
    {
      prompt: 'Build a concession into a speech on keeping a community workshop open late.',
      response:
        'Those who live above the workshop should not have to choose between sleep and supporting it. Later opening could begin with quiet handwork on one evening, followed by a review with those residents before any extension.',
      explanation:
        'The concession changes the proposal and gives affected listeners a role; it is not a token acknowledgement.',
    },
    'Develop a feasible and inclusive proposal, sustain a persuasive spoken voice and address the access and budget constraints honestly.',
  ),
];
