import { LessonPack } from "@/types";

type DemoLessonSeed = {
  id: string;
  title: string;
  classroomId: string;
  classSubjectId: string;
  chapterId: string;
  chapterTitle: string;
  topicId: string;
  topicTitle: string;
  grade: string;
  subject: string;
  language: string;
  learnerNeed: string;
  status: LessonPack["status"];
  runtimeMode: LessonPack["runtimeMode"];
  sourceType: string;
  confidence: number;
  model: string;
  latency: string;
  detectedText: string[];
  diagramElements: string[];
  equations?: string[];
  unclearRegions?: string[];
  confidenceNotes: string[];
  objective: string;
  keyConcepts: string[];
  teachingScript: string;
  classroomActivity: string;
  worksheet: string[];
  answerKey: string[];
  misconceptions: string[];
  differentiatedSupport: string;
  screenReaderSummary: string;
  audioStudyScript: string;
  visualDescription: string;
  stepByStepExplanation: string;
  vocabulary: LessonPack["studentAccessPack"]["vocabulary"];
  steps: string[];
  practiceQuestions: string[];
  selfCheckAnswers: string[];
  accessibilityWarnings?: string[];
};

const lessonSeeds: DemoLessonSeed[] = [
  {
    id: "photosynthesis",
    title: "Photosynthesis in Plants",
    classroomId: "grade-7-inclusive",
    classSubjectId: "grade-7-inclusive-science",
    chapterId: "science-plant-processes",
    chapterTitle: "Chapter 1: Plant Processes",
    topicId: "photosynthesis",
    topicTitle: "Photosynthesis",
    grade: "Grade 7",
    subject: "Science",
    language: "English",
    learnerNeed: "Low Vision",
    status: "Approved",
    runtimeMode: "Hosted Gemma",
    sourceType: "Blackboard diagram",
    confidence: 91,
    model: "Gemma 4 hosted demo",
    latency: "1.2s",
    detectedText: ["Photosynthesis", "CO2 + H2O -> Glucose + O2", "Sunlight", "Chlorophyll"],
    diagramElements: ["Sun", "Leaf", "Roots", "Input arrows", "Oxygen output arrow"],
    equations: ["CO2 + H2O -> Glucose + O2"],
    unclearRegions: ["The lower-right label is partly cropped."],
    confidenceNotes: ["The core process labels are readable.", "The cropped edge needs a teacher glance."],
    objective: "Students will explain how plants use sunlight, water, and carbon dioxide to make glucose and release oxygen.",
    keyConcepts: [
      "Inputs are sunlight, water, and carbon dioxide.",
      "Leaves contain chlorophyll, which helps capture light energy.",
      "Outputs are glucose for the plant and oxygen released to air."
    ],
    teachingScript:
      "Start with the plant diagram. Trace water from roots, carbon dioxide into the leaf, and sunlight onto chlorophyll. Then connect those inputs to glucose and oxygen using the equation as a summary, not as a memorization task.",
    classroomActivity:
      "Give students input and output cards. Ask them to stand around a plant sketch and narrate the process in order.",
    worksheet: [
      "List the three inputs needed for photosynthesis.",
      "What food does the plant make?",
      "Why do leaves matter in this process?"
    ],
    answerKey: [
      "Sunlight, water, and carbon dioxide.",
      "Glucose.",
      "Leaves contain chlorophyll and take in carbon dioxide."
    ],
    misconceptions: [
      "Plants do not get ready-made food from soil.",
      "Oxygen is released after the plant makes food."
    ],
    differentiatedSupport:
      "Support: Read the diagram as a sequence from roots to leaves to air.\nCore: Ask students to explain each input and output using one sentence.\nChallenge: Ask students to predict what happens if one input is missing.",
    screenReaderSummary:
      "Photosynthesis is how green plants make food. A plant uses sunlight, water, and carbon dioxide. It makes glucose and releases oxygen.",
    audioStudyScript:
      "Imagine a plant. Water enters through the roots. Carbon dioxide enters through the leaves. Sunlight gives energy. Inside the leaf, the plant makes glucose. Oxygen leaves the plant and goes into the air.",
    visualDescription:
      "A plant is in the center. The sun is above it. Arrows show water moving from soil into roots, carbon dioxide entering leaves, and oxygen moving out of the leaves.",
    stepByStepExplanation:
      "Roots absorb water. Leaves take in carbon dioxide. Sunlight reaches the leaves. Chlorophyll helps the plant use light energy. The plant makes glucose and releases oxygen.",
    vocabulary: [
      { term: "Photosynthesis", meaning: "The process plants use to make food." },
      { term: "Chlorophyll", meaning: "Green material in leaves that helps capture light." },
      { term: "Glucose", meaning: "Sugar made by plants for energy." }
    ],
    steps: ["Roots take in water.", "Leaves take in carbon dioxide.", "Sunlight gives energy.", "The plant makes glucose.", "Oxygen is released."],
    practiceQuestions: [
      "What are the three inputs of photosynthesis?",
      "What does the plant release into the air?",
      "Which plant part takes in water?"
    ],
    selfCheckAnswers: ["Sunlight, water, and carbon dioxide.", "Oxygen.", "Roots."],
    accessibilityWarnings: ["One cropped board edge may hide a label."]
  },
  {
    id: "water-cycle",
    title: "Water Cycle",
    classroomId: "grade-7-inclusive",
    classSubjectId: "grade-7-inclusive-science",
    chapterId: "science-plant-processes",
    chapterTitle: "Chapter 1: Plant Processes",
    topicId: "water-cycle",
    topicTitle: "Water Cycle",
    grade: "Grade 7",
    subject: "Science",
    language: "English",
    learnerNeed: "Dyslexia Friendly",
    status: "Draft",
    runtimeMode: "Local Ollama",
    sourceType: "Textbook diagram",
    confidence: 86,
    model: "Gemma local proof",
    latency: "2.4s",
    detectedText: ["Evaporation", "Condensation", "Precipitation", "Collection"],
    diagramElements: ["Sun", "Water body", "Cloud", "Rain arrows", "Mountain"],
    unclearRegions: ["The top label is partly cut off."],
    confidenceNotes: ["Main cycle labels are clear.", "The heading may need teacher confirmation."],
    objective: "Students will describe evaporation, condensation, precipitation, and collection as repeated parts of the water cycle.",
    keyConcepts: ["Sun heats water.", "Water vapor cools to form clouds.", "Water returns to Earth as rain."],
    teachingScript:
      "Use the diagram as a loop. Point to the water body first, then the sun, then clouds, then rain. Repeat the loop twice so learners hear that the cycle continues.",
    classroomActivity:
      "Set up four corners for evaporation, condensation, precipitation, and collection. Students move as water drops and say what changes at each corner.",
    worksheet: ["Define evaporation.", "What forms clouds?", "Why is the water cycle called a cycle?"],
    answerKey: ["Water changes into vapor.", "Water vapor cools into drops.", "The same water keeps moving from Earth to air and back."],
    misconceptions: ["Clouds are not smoke.", "Rain water does not disappear forever."],
    differentiatedSupport:
      "Support: Use four numbered cards and read each step aloud.\nCore: Ask students to explain the cycle from water body to cloud to rain.\nChallenge: Ask students to connect the water cycle to a local rainy day.",
    screenReaderSummary: "The water cycle is the movement of water from Earth to air and back again.",
    audioStudyScript:
      "The sun heats water in rivers and lakes. Some water becomes vapor and rises. The vapor cools and forms clouds. When clouds become heavy, water falls as rain.",
    visualDescription:
      "The diagram shows a water body at the bottom, the sun above it, a cloud near the top, and arrows showing water moving up and rain moving down.",
    stepByStepExplanation:
      "First, the sun heats surface water. Next, water vapor rises. Then the vapor cools and forms clouds. Finally, water falls as rain and collects again.",
    vocabulary: [
      { term: "Evaporation", meaning: "Water changes into vapor." },
      { term: "Condensation", meaning: "Vapor cools and becomes drops." },
      { term: "Precipitation", meaning: "Water falls from clouds." }
    ],
    steps: ["Sun heats water.", "Water vapor rises.", "Clouds form.", "Rain falls.", "Water collects."],
    practiceQuestions: ["What heats the water?", "What falls from clouds?", "Name one stage of the water cycle."],
    selfCheckAnswers: ["The sun.", "Rain.", "Evaporation, condensation, precipitation, or collection."],
    accessibilityWarnings: ["Top label is partly cropped."]
  },
  {
    id: "fractions",
    title: "Fractions on a Number Line",
    classroomId: "grade-8-a",
    classSubjectId: "grade-8-a-math",
    chapterId: "math-fractions",
    chapterTitle: "Chapter 1: Fractions",
    topicId: "fractions-number-line",
    topicTitle: "Fractions on a Number Line",
    grade: "Grade 8",
    subject: "Math",
    language: "English",
    learnerNeed: "Dyslexia Friendly",
    status: "Approved",
    runtimeMode: "Demo Fixture",
    sourceType: "Math worksheet",
    confidence: 88,
    model: "Mock JSON fallback",
    latency: "0.1s",
    detectedText: ["0", "1/4", "1/2", "3/4", "1"],
    diagramElements: ["Number line", "Equal intervals", "Fraction labels"],
    confidenceNotes: ["Fraction labels are readable.", "Equal spacing is visible."],
    objective: "Students will place simple fractions between 0 and 1 by dividing the number line into equal parts.",
    keyConcepts: ["The denominator tells how many equal parts.", "The numerator tells how many parts to count.", "Fractions can be compared by position on a number line."],
    teachingScript:
      "Draw a line from 0 to 1. Divide it into equal spaces, then count from zero. Emphasize that one-half sits after two fourths because both marks name the same position.",
    classroomActivity:
      "Use floor tape as a number line. Students stand at zero, one-half, one-fourth, and three-fourths, then explain their position.",
    worksheet: ["Mark one-half on a number line.", "Which is larger: one-half or one-fourth?", "Explain why equal spaces matter."],
    answerKey: ["One-half is midway between 0 and 1.", "One-half.", "Fractions are placed correctly only when the whole is split into equal parts."],
    misconceptions: ["Students may count tick marks instead of spaces.", "Students may think a larger denominator always means a larger fraction."],
    differentiatedSupport:
      "Support: Use a large number line and count spaces aloud.\nCore: Ask students to place halves and fourths independently.\nChallenge: Ask students to show why two-fourths equals one-half.",
    screenReaderSummary: "Fractions can be shown on a number line by splitting the space from 0 to 1 into equal parts.",
    audioStudyScript:
      "Imagine a straight line from zero to one. Split the line into four equal spaces. One-fourth is after the first space, one-half is after the second space, and three-fourths is after the third space.",
    visualDescription:
      "A horizontal number line begins at 0 and ends at 1. It is divided into four equal spaces with labels one-fourth, one-half, and three-fourths.",
    stepByStepExplanation:
      "Draw the whole from 0 to 1. Divide it into equal parts. Count the required number of parts from zero. Place the fraction at that point.",
    vocabulary: [
      { term: "Numerator", meaning: "The top number in a fraction." },
      { term: "Denominator", meaning: "The bottom number that shows equal parts." },
      { term: "Equivalent fractions", meaning: "Fractions with the same value." }
    ],
    steps: ["Draw 0 to 1.", "Split into equal parts.", "Count from 0.", "Mark the fraction."],
    practiceQuestions: ["Where is one-half?", "How many equal spaces are in fourths?", "Which is greater: one-half or one-fourth?"],
    selfCheckAnswers: ["Midway between 0 and 1.", "Four.", "One-half."]
  },
  {
    id: "linear-equations",
    title: "Linear Equations",
    classroomId: "grade-8-a",
    classSubjectId: "grade-8-a-math",
    chapterId: "math-algebra",
    chapterTitle: "Chapter 2: Algebra Basics",
    topicId: "linear-equations",
    topicTitle: "Solving Linear Equations",
    grade: "Grade 8",
    subject: "Math",
    language: "Hindi + English",
    learnerNeed: "Multilingual",
    status: "Needs Review",
    runtimeMode: "Demo Fixture",
    sourceType: "Worksheet photo",
    confidence: 82,
    model: "Mock JSON fallback",
    latency: "0.1s",
    detectedText: ["2x + 3 = 7", "2x = 4", "x = 2"],
    diagramElements: ["Equation box", "Worked solution", "Balance symbol"],
    equations: ["2x + 3 = 7", "x = 2"],
    unclearRegions: ["The second line is faint because of low light."],
    confidenceNotes: ["The equation is readable.", "The final answer should be reviewed by the teacher."],
    objective: "Students will solve one-step and two-step linear equations using inverse operations.",
    keyConcepts: ["Keep both sides balanced.", "Undo addition or subtraction before division.", "Check the answer in the original equation."],
    teachingScript:
      "Read the equation aloud. For 2x + 3 = 7, subtract 3 from both sides, then divide by 2. Ask learners to check x = 2 in the original equation.",
    classroomActivity:
      "Draw a balance scale. Students suggest the same operation for both pans before each algebra step.",
    worksheet: ["Solve 3x + 2 = 11.", "Solve 5x - 4 = 16.", "Check x = 2 in 2x + 3 = 7."],
    answerKey: ["x = 3", "x = 4", "2 times 2 plus 3 equals 7."],
    misconceptions: ["Students may change only one side.", "Students may divide before removing the constant."],
    differentiatedSupport:
      "Support: Give bilingual prompts: subtract, divide, check.\nCore: Ask students to write each operation on a new line.\nChallenge: Ask students to create a two-step equation with answer x = 5.",
    screenReaderSummary: "A linear equation has a missing value. We find it by keeping both sides equal.",
    audioStudyScript:
      "For 2x plus 3 equals 7, first remove plus 3 by subtracting 3 from both sides. Then 2x equals 4. Divide both sides by 2. The value of x is 2.",
    visualDescription:
      "The worksheet shows the equation 2x plus 3 equals 7. Below it, the solution shows that x equals 2.",
    stepByStepExplanation:
      "Keep both sides balanced. Subtract 3 from both sides so 2x = 4. Divide both sides by 2. Check that x = 2 works in the original equation.",
    vocabulary: [
      { term: "Equation", meaning: "A statement where two sides are equal." },
      { term: "Variable", meaning: "A letter that stands for an unknown number." },
      { term: "Inverse operation", meaning: "An operation that undoes another operation." }
    ],
    steps: ["Subtract 3 from both sides.", "Divide both sides by 2.", "Check the answer."],
    practiceQuestions: ["What should you do first in 2x + 3 = 7?", "What is x?", "Why do we check the answer?"],
    selfCheckAnswers: ["Subtract 3 from both sides.", "x = 2.", "To confirm it makes the equation true."],
    accessibilityWarnings: ["Low lighting may affect OCR accuracy."]
  },
  {
    id: "digestive-system",
    title: "Digestive System Overview",
    classroomId: "grade-9-science",
    classSubjectId: "grade-9-science-science",
    chapterId: "science-human-systems",
    chapterTitle: "Chapter 2: Human Body Systems",
    topicId: "digestive-system",
    topicTitle: "Digestive System",
    grade: "Grade 9",
    subject: "Science",
    language: "English",
    learnerNeed: "Slow Learner",
    status: "Approved",
    runtimeMode: "Hosted Gemma",
    sourceType: "Biology slide diagram",
    confidence: 89,
    model: "Gemma 4 hosted demo",
    latency: "1.4s",
    detectedText: ["Mouth", "Oesophagus", "Stomach", "Small intestine", "Large intestine"],
    diagramElements: ["Human torso", "Digestive tract", "Organ labels"],
    confidenceNotes: ["Major organs are detected.", "Spelling of oesophagus follows textbook label."],
    objective: "Students will describe the path of food through the digestive system and state the role of major organs.",
    keyConcepts: ["Digestion begins in the mouth.", "The stomach churns food and mixes it with juices.", "The small intestine absorbs nutrients."],
    teachingScript:
      "Use the diagram as a route map. Follow food from mouth to oesophagus, stomach, small intestine, and large intestine. Pause after each organ for one role.",
    classroomActivity:
      "Students hold organ cards in order and pass a food-card along the digestive path while saying each organ's job.",
    worksheet: ["Where does digestion begin?", "Which organ absorbs most nutrients?", "What is the job of the large intestine?"],
    answerKey: ["Mouth.", "Small intestine.", "It absorbs water and helps form waste."],
    misconceptions: ["Food does not go into the lungs.", "The stomach does not absorb most nutrients."],
    differentiatedSupport:
      "Support: Use five organ cards and repeat the path twice.\nCore: Ask students to match each organ with one function.\nChallenge: Ask students to compare mechanical and chemical digestion.",
    screenReaderSummary: "The digestive system breaks food into smaller parts so the body can absorb nutrients.",
    audioStudyScript:
      "Food enters the mouth, moves down the oesophagus, reaches the stomach, then moves into the small intestine where nutrients are absorbed. The large intestine absorbs water.",
    visualDescription:
      "The diagram shows a human torso with a tube-like digestive path labelled from mouth to large intestine.",
    stepByStepExplanation:
      "Chewing starts digestion. The oesophagus moves food to the stomach. The stomach mixes food with digestive juices. The small intestine absorbs nutrients. The large intestine absorbs water.",
    vocabulary: [
      { term: "Digestion", meaning: "Breaking food into simpler parts." },
      { term: "Oesophagus", meaning: "Tube that carries food to the stomach." },
      { term: "Nutrients", meaning: "Useful substances absorbed from food." }
    ],
    steps: ["Food enters the mouth.", "Food moves through the oesophagus.", "The stomach mixes food.", "The small intestine absorbs nutrients.", "The large intestine absorbs water."],
    practiceQuestions: ["Name the path food follows.", "Where are nutrients absorbed?", "What does the stomach do?"],
    selfCheckAnswers: ["Mouth, oesophagus, stomach, small intestine, large intestine.", "Small intestine.", "It churns food and mixes it with juices."]
  },
  {
    id: "acids-and-bases",
    title: "Acids, Bases, and Indicators",
    classroomId: "grade-9-science",
    classSubjectId: "grade-9-science-science",
    chapterId: "chemistry-acids-bases",
    chapterTitle: "Chapter 1: Acids, Bases, and Indicators",
    topicId: "acids-bases-indicators",
    topicTitle: "Acids and Bases",
    grade: "Grade 9",
    subject: "Science",
    language: "English",
    learnerNeed: "Standard",
    status: "Needs Review",
    runtimeMode: "Hosted Gemma",
    sourceType: "Lab observation notes",
    confidence: 84,
    model: "Gemma 4 hosted demo",
    latency: "1.6s",
    detectedText: ["Blue litmus", "Red litmus", "Acid", "Base", "Neutral"],
    diagramElements: ["Test tubes", "Litmus strips", "Observation table"],
    unclearRegions: ["One test-tube label is faint."],
    confidenceNotes: ["The observation table is mostly legible.", "Teacher should confirm the faint sample label."],
    objective: "Students will identify acids and bases using litmus paper and everyday examples.",
    keyConcepts: ["Acids turn blue litmus red.", "Bases turn red litmus blue.", "Indicators show whether a solution is acidic or basic."],
    teachingScript:
      "Begin with familiar examples such as lemon juice and soap solution. Demonstrate litmus color changes and record observations in a table.",
    classroomActivity:
      "Use safe classroom samples and paper strips. Students predict acid or base before the teacher reveals the litmus result.",
    worksheet: ["What happens to blue litmus in an acid?", "Give one household base.", "Why do we use indicators?"],
    answerKey: ["It turns red.", "Soap solution or baking soda solution.", "Indicators help identify acids and bases."],
    misconceptions: ["All acids are not dangerous at the same strength.", "Taste should never be used to test unknown substances."],
    differentiatedSupport:
      "Support: Use a two-column acid/base chart with color words.\nCore: Ask students to predict and then record observations.\nChallenge: Ask students to explain why safety rules matter during testing.",
    screenReaderSummary: "Acids and bases can be tested using indicators such as litmus paper.",
    audioStudyScript:
      "An acid turns blue litmus red. A base turns red litmus blue. Litmus paper is an indicator because it shows a color change.",
    visualDescription:
      "A lab table shows test tubes beside red and blue litmus strips. An observation chart records color changes.",
    stepByStepExplanation:
      "Choose a safe sample. Dip litmus paper into it. Watch for color change. Blue to red shows acid. Red to blue shows base. Record the result.",
    vocabulary: [
      { term: "Acid", meaning: "A substance that turns blue litmus red." },
      { term: "Base", meaning: "A substance that turns red litmus blue." },
      { term: "Indicator", meaning: "A substance that changes color during a test." }
    ],
    steps: ["Choose a safe sample.", "Use litmus paper.", "Observe the color.", "Classify acid or base.", "Record safely."],
    practiceQuestions: ["What color change shows an acid?", "Name one indicator.", "Why should unknown samples not be tasted?"],
    selfCheckAnswers: ["Blue litmus turns red.", "Litmus.", "It can be unsafe."],
    accessibilityWarnings: ["One test-tube label is faint and needs review."]
  },
  {
    id: "reading-main-idea",
    title: "Finding the Main Idea",
    classroomId: "grade-7-inclusive",
    classSubjectId: "grade-7-inclusive-english",
    chapterId: "english-reading",
    chapterTitle: "Chapter 1: Reading Skills",
    topicId: "main-idea",
    topicTitle: "Main Idea",
    grade: "Grade 7",
    subject: "English",
    language: "English",
    learnerNeed: "Dyslexia Friendly",
    status: "Approved",
    runtimeMode: "Local Ollama",
    sourceType: "Reading passage handout",
    confidence: 87,
    model: "Gemma local proof",
    latency: "2.1s",
    detectedText: ["main idea", "supporting detail", "paragraph", "evidence"],
    diagramElements: ["Passage box", "Highlight marks", "Margin notes"],
    confidenceNotes: ["The passage structure is clear.", "Margin notes support main-idea teaching."],
    objective: "Students will identify the main idea of a paragraph and support it with two details.",
    keyConcepts: ["The main idea is what the paragraph is mostly about.", "Supporting details give facts or examples.", "A title can hint at the main idea but does not always state it fully."],
    teachingScript:
      "Read the paragraph once for meaning. Ask what the paragraph is mostly about, then underline two details that prove the answer.",
    classroomActivity:
      "Students use two colors: one for the main idea and one for supporting details. Partners compare their choices.",
    worksheet: ["Write the main idea of the passage.", "Underline two supporting details.", "Explain why your main idea fits the whole paragraph."],
    answerKey: ["The answer should state the paragraph's central point.", "Details should come from the passage.", "The explanation should connect both details to the main idea."],
    misconceptions: ["The first sentence is not always the main idea.", "A small detail is not the same as the main idea."],
    differentiatedSupport:
      "Support: Read the passage in short chunks and ask one guiding question after each chunk.\nCore: Ask students to write one main idea sentence and two details.\nChallenge: Ask students to compare two possible main ideas and choose the stronger one.",
    screenReaderSummary: "The main idea tells what a paragraph is mostly about. Supporting details prove the main idea.",
    audioStudyScript:
      "Read the paragraph. Ask: What is this mostly about? Then find two details that support that answer.",
    visualDescription:
      "The handout shows a paragraph with highlighted phrases and margin notes pointing to the main idea and details.",
    stepByStepExplanation:
      "Read the paragraph. Ask what most sentences are about. Write one main idea sentence. Find two details that prove it. Check that your sentence fits the whole paragraph.",
    vocabulary: [
      { term: "Main idea", meaning: "What the paragraph is mostly about." },
      { term: "Supporting detail", meaning: "A fact or example that proves the main idea." },
      { term: "Evidence", meaning: "Information from the text that supports an answer." }
    ],
    steps: ["Read the paragraph.", "Ask what it is mostly about.", "Write the main idea.", "Find two details.", "Check your answer."],
    practiceQuestions: ["What is a main idea?", "How many details should you find?", "Why do details matter?"],
    selfCheckAnswers: ["What the paragraph is mostly about.", "Two for this lesson.", "They prove the main idea."]
  },
  {
    id: "constitution-basics",
    title: "Indian Constitution Basics",
    classroomId: "grade-7-inclusive",
    classSubjectId: "grade-7-inclusive-social-studies",
    chapterId: "social-civics",
    chapterTitle: "Chapter 1: Community and Constitution",
    topicId: "constitution-basics",
    topicTitle: "Indian Constitution Basics",
    grade: "Grade 7",
    subject: "Social Studies",
    language: "Hindi + English",
    learnerNeed: "Multilingual",
    status: "Exported",
    runtimeMode: "Hosted Gemma",
    sourceType: "Civics notes",
    confidence: 90,
    model: "Gemma 4 hosted demo",
    latency: "1.3s",
    detectedText: ["Preamble", "rights", "duties", "justice", "equality"],
    diagramElements: ["Notebook page", "Preamble keywords", "Rights and duties table"],
    confidenceNotes: ["Keyword headings are clear.", "The rights and duties table is readable."],
    objective: "Students will describe the purpose of the Indian Constitution and identify examples of rights and duties.",
    keyConcepts: ["The Constitution gives rules for governing the country.", "Rights protect citizens.", "Duties remind citizens how to support the community."],
    teachingScript:
      "Begin with class rules as an analogy. Then explain that the Constitution is a rulebook for the country, with rights, duties, and values such as justice and equality.",
    classroomActivity:
      "Students sort cards into rights and duties, then explain one card in their home language or English.",
    worksheet: ["What is the Constitution?", "Name one right.", "Name one duty."],
    answerKey: ["A set of rules and values for governing the country.", "Example: right to education or equality.", "Example: respect public property or follow laws."],
    misconceptions: ["Rights and duties are connected but not identical.", "The Constitution is not only for leaders; it affects citizens too."],
    differentiatedSupport:
      "Support: Use bilingual rights and duties cards.\nCore: Ask students to give one example of a right and one duty.\nChallenge: Ask students to explain how equality helps a classroom or community.",
    screenReaderSummary: "The Indian Constitution is a set of rules and values for the country. It explains rights, duties, justice, and equality.",
    audioStudyScript:
      "Think of class rules. They help everyone learn together. The Constitution works like a rulebook for the country. It protects rights and reminds citizens of duties.",
    visualDescription:
      "The notes show a table with rights on one side and duties on the other, plus key words from the Preamble.",
    stepByStepExplanation:
      "The Constitution explains how the country is governed. It protects people's rights. It also reminds citizens about duties. Values like justice and equality guide these rules.",
    vocabulary: [
      { term: "Constitution", meaning: "A country's basic rulebook." },
      { term: "Right", meaning: "A freedom or protection citizens have." },
      { term: "Duty", meaning: "A responsibility citizens should follow." }
    ],
    steps: ["Understand the rulebook idea.", "Learn rights.", "Learn duties.", "Connect them to justice and equality."],
    practiceQuestions: ["What is the Constitution?", "Give one example of a right.", "Give one example of a duty."],
    selfCheckAnswers: ["A basic rulebook for the country.", "Right to education or equality.", "Respect public property or follow laws."]
  }
];

export const lessonPacks: LessonPack[] = lessonSeeds.map((seed) => {
  const accessibilityWarnings = seed.accessibilityWarnings ?? [];
  const sourceUnclear = Boolean(seed.unclearRegions?.length);

  return {
    id: seed.id,
    title: seed.title,
    classroomId: seed.classroomId,
    classSubjectId: seed.classSubjectId,
    chapterId: seed.chapterId,
    chapterTitle: seed.chapterTitle,
    topicId: seed.topicId,
    topicTitle: seed.topicTitle,
    grade: seed.grade,
    subject: seed.subject,
    language: seed.language,
    learnerNeed: seed.learnerNeed,
    outputType: "Teacher + Student + Trust Packs",
    status: seed.status,
    runtimeMode: seed.runtimeMode,
    qualityChecks: [
      { label: "Focus", status: "Good" },
      {
        label: "Lighting",
        status: accessibilityWarnings.some((warning) => warning.toLowerCase().includes("light")) ? "Needs Review" : "Good"
      },
      { label: "Crop", status: sourceUnclear ? "Needs Review" : "Good" }
    ],
    sourceCard: {
      topic: seed.topicTitle,
      sourceType: seed.sourceType,
      confidence: seed.confidence,
      detectedText: seed.detectedText,
      diagramElements: seed.diagramElements,
      equations: seed.equations ?? [],
      unclearRegions: seed.unclearRegions ?? [],
      confidenceNotes: seed.confidenceNotes
    },
    teacherPack: {
      objective: seed.objective,
      keyConcepts: seed.keyConcepts,
      teachingScript: seed.teachingScript,
      classroomActivity: seed.classroomActivity,
      worksheet: seed.worksheet,
      answerKey: seed.answerKey,
      misconceptions: seed.misconceptions,
      differentiatedSupport: seed.differentiatedSupport
    },
    studentAccessPack: {
      screenReaderSummary: seed.screenReaderSummary,
      audioStudyScript: seed.audioStudyScript,
      visualDescription: seed.visualDescription,
      stepByStepExplanation: seed.stepByStepExplanation,
      vocabulary: seed.vocabulary,
      steps: seed.steps,
      practiceQuestions: seed.practiceQuestions,
      selfCheckAnswers: seed.selfCheckAnswers
    },
    trustPack: {
      runtimeMode: seed.runtimeMode,
      model: seed.model,
      latency: seed.latency,
      schemaStatus: "Valid",
      teacherReviewStatus: accessibilityWarnings.length > 0 || seed.status === "Needs Review" ? "Review Required" : "Approved",
      confidence: seed.confidence,
      accessibilityWarnings
    },
    safetyFlags: {
      sourceUnclear,
      possibleOcrError: accessibilityWarnings.some((warning) =>
        ["ocr", "label", "faint", "light"].some((term) => warning.toLowerCase().includes(term))
      ),
      teacherReviewRequired: accessibilityWarnings.length > 0 || seed.status === "Needs Review"
    },
    trace: {
      runtime: seed.runtimeMode,
      model: seed.model,
      hostedApiUsed: seed.runtimeMode === "Hosted Gemma",
      localOnly: seed.runtimeMode !== "Hosted Gemma",
      latencyMs: Number.parseInt(seed.latency, 10) || 0,
      generatedAt: "2026-05-14T09:30:00.000Z"
    }
  };
});

export const featuredLessonPack = lessonPacks[0];
