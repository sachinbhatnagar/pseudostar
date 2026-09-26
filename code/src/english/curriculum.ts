import type { Grade, Skill } from './model';

// This progression is authored for PseudoStar. School grades are not Cambridge stages.
export const curriculum: Record<
  Grade,
  { title: string; emphasis: string; skills: Record<Skill, string> }
> = {
  8: {
    title: 'Build control',
    emphasis: 'Clear sentences, relevant evidence and short writing with a purpose.',
    skills: {
      understanding: 'Identify the main idea and make a supported inference.',
      evidence: 'Select a relevant detail and explain how it supports your point.',
      effect: 'Explain what a specific word or image suggests in its context.',
      vocabulary: 'Choose clear, precise words that fit the meaning and situation.',
      structure: 'Order ideas clearly and link sentences within a paragraph.',
      audience: 'Use a suitable voice and include details your reader needs.',
      accuracy: 'Control sentence boundaries, basic punctuation and consistent tense.',
    },
  },
  9: {
    title: 'Develop and connect',
    emphasis: 'Develop analysis and arguments; summarise selectively and sustain a voice.',
    skills: {
      understanding: 'Distinguish the main claim from supporting detail and implied attitudes.',
      evidence: 'Connect precise evidence to a developed interpretation; avoid unsupported claims.',
      effect: 'Explain how language choices work together to shape a reader’s impression.',
      vocabulary: 'Use connotations and register deliberately without adding unnecessary words.',
      structure: 'Develop and connect ideas across paragraphs; select and group key points.',
      audience: 'Sustain an appropriate voice and address the audience’s likely concerns.',
      accuracy: 'Control varied sentences, agreement, punctuation and tense shifts.',
    },
  },
  10: {
    title: 'Evaluate and refine',
    emphasis: 'Evaluate viewpoints, synthesise sources and control independent timed writing.',
    skills: {
      understanding: 'Evaluate implications, qualifications and limits of a source’s claims.',
      evidence: 'Weigh relevant evidence and acknowledge a plausible alternative interpretation.',
      effect:
        'Analyse precise choices and shifts in language without assuming one reader response.',
      vocabulary: 'Control nuance, register and concision for a specific purpose.',
      structure:
        'Shape a coherent whole, synthesising sources and giving ideas proportionate space.',
      audience: 'Adapt tone and emphasis to persuade or engage a specific audience responsibly.',
      accuracy: 'Use complex sentence structures and punctuation accurately to control meaning.',
    },
  },
};

export const curriculumBasis = {
  notice:
    'Original PseudoStar practice and app-authored criteria. These are not official examination questions, marks or grade predictions.',
  foundation: 'Cambridge Lower Secondary English 0861',
  destination: 'Cambridge IGCSE First Language English 0500',
  edition: '2027–2029 syllabus; specimen criteria from 2027',
  sources: [
    'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-lower-secondary/curriculum/english/',
    'https://www.cambridgeinternational.org/Images/718783-2027-2029-syllabus.pdf',
    'https://www.cambridgeinternational.org/Images/718838-2027-specimen-paper-1-mark-scheme.pdf',
    'https://www.cambridgeinternational.org/Images/718839-2027-specimen-paper-2-mark-scheme.pdf',
  ],
};
