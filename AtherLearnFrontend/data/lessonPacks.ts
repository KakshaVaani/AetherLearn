import { LessonPack } from "@/types";

export const lessonPacks: LessonPack[] = [
  {
    id: "photosynthesis",
    title: "Photosynthesis in Plants",
    classroomId: "grade-7-inclusive",
    classSubjectId: "grade-7-inclusive-science",
    grade: "Grade 7",
    subject: "Science",
    language: "English",
    learnerNeed: "Low Vision",
    outputType: "Teacher + Student + Trust Packs",
    status: "Approved",
    runtimeMode: "Hosted Gemma",
    qualityChecks: [
      { label: "Focus", status: "Good" },
      { label: "Lighting", status: "Good" },
      { label: "Crop", status: "Good" }
    ],
    sourceCard: {
      topic: "Photosynthesis in Plants",
      sourceType: "Blackboard diagram",
      confidence: 90,
      detectedText: ["Photosynthesis", "6CO2 + 6H2O -> C6H12O6 + 6O2", "Sunlight", "CO2", "H2O", "Glucose"],
      diagramElements: ["Sun", "Plant", "Roots", "Input arrows", "Output arrows"],
      equations: ["6CO2 + 6H2O -> C6H12O6 + 6O2"],
      unclearRegions: ["The bottom-right edge of the board is slightly cropped."],
      confidenceNotes: [
        "The main topic and chemical equation are readable.",
        "One arrow label may need teacher confirmation."
      ]
    },
    teacherPack: {
      objective:
        "Students will understand how green plants use sunlight, water, and carbon dioxide to make food and release oxygen.",
      keyConcepts: [
        "Inputs: sunlight, water, and carbon dioxide",
        "Output: glucose for the plant and oxygen released into the air",
        "Process happens mainly in green leaves"
      ],
      teachingScript:
        "Begin by naming the three inputs. Ask students to trace how water enters through roots and carbon dioxide enters through leaves. Then connect the chemical equation to the diagram using simple language before moving to practice questions.",
      classroomActivity:
        "Ask students to form two groups: inputs and outputs. Each student holds one card and stands in order to explain the process aloud.",
      worksheet: [
        "List the three things a plant needs for photosynthesis.",
        "Name the food made by the plant.",
        "Write one reason oxygen is important for living things."
      ],
      answerKey: ["Sunlight, water, and carbon dioxide.", "Glucose.", "Living things use oxygen for breathing."],
      misconceptions: [
        "Plants do not get food directly from soil.",
        "Oxygen is released after the plant makes food."
      ],
      differentiatedSupport:
        "For low-vision learners, read the diagram as a sequence: sunlight reaches the leaves, roots bring water upward, leaves take in carbon dioxide, and oxygen leaves the plant."
    },
    studentAccessPack: {
      screenReaderSummary:
        "Photosynthesis is how green plants make their food. A plant uses sunlight, water, and carbon dioxide. It makes glucose and releases oxygen.",
      audioStudyScript:
        "First, imagine a green plant. Sunlight reaches the leaves. Water moves from the soil into the roots. Carbon dioxide enters the leaves from the air. Inside the leaves, the plant makes glucose, which is food for the plant. Oxygen leaves the plant and goes into the air.",
      visualDescription:
        "The diagram shows a plant in the center. A sun is above the plant. An arrow from the sun points toward the leaves for sunlight. Water moves from the soil into the roots. Carbon dioxide enters the leaves, and oxygen moves out into the air.",
      vocabulary: [
        { term: "Photosynthesis", meaning: "The process plants use to make food." },
        { term: "Glucose", meaning: "Sugar made by the plant for energy." },
        { term: "Carbon dioxide", meaning: "A gas from the air that plants use." },
        { term: "Oxygen", meaning: "A gas released by plants." }
      ],
      steps: [
        "Roots take in water from the soil.",
        "Leaves take in carbon dioxide from the air.",
        "Sunlight gives energy to the leaves.",
        "The plant makes glucose.",
        "The plant releases oxygen."
      ],
      practiceQuestions: [
        "What are the three inputs of photosynthesis?",
        "What food does the plant make?",
        "Which part of the plant takes in water?"
      ],
      selfCheckAnswers: ["Sunlight, water, and carbon dioxide.", "Glucose.", "Roots."]
    },
    trustPack: {
      runtimeMode: "Hosted Gemma",
      model: "Gemma 4 demo runtime",
      latency: "1.2s",
      schemaStatus: "Valid",
      teacherReviewStatus: "Approved",
      confidence: 90,
      accessibilityWarnings: ["One cropped board edge may hide a label."]
    },
    safetyFlags: {
      sourceUnclear: false,
      possibleOcrError: false,
      teacherReviewRequired: false
    }
  },
  {
    id: "linear-equations",
    title: "Linear Equations",
    classroomId: "grade-8-a",
    classSubjectId: "grade-8-a-math",
    grade: "Grade 8",
    subject: "Mathematics",
    language: "Hindi",
    learnerNeed: "Multilingual",
    outputType: "Teacher + Student + Trust Packs",
    status: "Needs Review",
    runtimeMode: "Demo Fixture",
    qualityChecks: [
      { label: "Focus", status: "Good" },
      { label: "Lighting", status: "Needs Review" },
      { label: "Crop", status: "Good" }
    ],
    sourceCard: {
      topic: "Solving a Linear Equation",
      sourceType: "Worksheet photo",
      confidence: 82,
      detectedText: ["2x + 3 = 7", "x = 2"],
      diagramElements: ["Equation box", "Worked solution"],
      equations: ["2x + 3 = 7"],
      unclearRegions: ["The second line is faint because of low light."],
      confidenceNotes: ["The equation is readable.", "The final answer should be reviewed by the teacher."]
    },
    teacherPack: {
      objective: "Students will solve one-step and two-step linear equations using inverse operations.",
      keyConcepts: ["Keep both sides balanced", "Undo addition before multiplication", "Check the answer"],
      teachingScript:
        "Read the equation aloud, identify the constant term, subtract it from both sides, and divide by the coefficient of x.",
      classroomActivity: "Use a balance scale drawing to show that every operation must be done on both sides.",
      worksheet: ["Solve 3x + 2 = 11.", "Solve 5x - 4 = 16.", "Check x = 2 in 2x + 3 = 7."],
      answerKey: ["x = 3", "x = 4", "2 times 2 plus 3 equals 7."],
      misconceptions: ["Students may change only one side.", "Students may divide before removing the constant."],
      differentiatedSupport: "Use short bilingual prompts and write each operation on a separate line."
    },
    studentAccessPack: {
      screenReaderSummary: "A linear equation has a missing value. We find it by keeping both sides equal.",
      audioStudyScript:
        "For 2x plus 3 equals 7, first remove plus 3 by subtracting 3 from both sides. Then 2x equals 4. Divide both sides by 2. The value of x is 2.",
      visualDescription:
        "The worksheet shows the equation 2x plus 3 equals 7. Below it, the solution shows that x equals 2.",
      vocabulary: [
        { term: "Equation", meaning: "A statement where two sides are equal." },
        { term: "Variable", meaning: "A letter that stands for an unknown number." }
      ],
      steps: ["Subtract 3 from both sides.", "Divide both sides by 2.", "Check the answer in the original equation."],
      practiceQuestions: ["What should you do first in 2x + 3 = 7?", "What is x?"],
      selfCheckAnswers: ["Subtract 3 from both sides.", "x = 2."]
    },
    trustPack: {
      runtimeMode: "Demo Fixture",
      model: "Mock JSON fallback",
      latency: "0.1s",
      schemaStatus: "Valid",
      teacherReviewStatus: "Review Required",
      confidence: 82,
      accessibilityWarnings: ["Low lighting may affect OCR accuracy."]
    },
    safetyFlags: {
      sourceUnclear: true,
      possibleOcrError: true,
      teacherReviewRequired: true
    }
  },
  {
    id: "water-cycle",
    title: "Water Cycle",
    classroomId: "grade-7-inclusive",
    classSubjectId: "grade-7-inclusive-science",
    grade: "Grade 7",
    subject: "Science",
    language: "English",
    learnerNeed: "Dyslexia Friendly",
    outputType: "Teacher + Student + Trust Packs",
    status: "Draft",
    runtimeMode: "Local Ollama",
    qualityChecks: [
      { label: "Focus", status: "Good" },
      { label: "Lighting", status: "Good" },
      { label: "Crop", status: "Needs Review" }
    ],
    sourceCard: {
      topic: "Water Cycle",
      sourceType: "Textbook diagram",
      confidence: 86,
      detectedText: ["Evaporation", "Condensation", "Rain"],
      diagramElements: ["Cloud", "Sun", "Water body", "Rain arrows"],
      equations: [],
      unclearRegions: ["The top label is partly cut off."],
      confidenceNotes: ["Main cycle labels are clear.", "The heading may be missing."]
    },
    teacherPack: {
      objective: "Students will describe evaporation, condensation, and precipitation in the water cycle.",
      keyConcepts: ["Sun heats water", "Water vapor forms clouds", "Rain returns water to land and rivers"],
      teachingScript: "Explain the cycle as a repeated journey of water from surface to sky and back.",
      classroomActivity: "Students act as water drops moving through the classroom cycle stations.",
      worksheet: ["Define evaporation.", "What happens inside clouds?", "Why is the water cycle repeated?"],
      answerKey: ["Water changes to vapor.", "Water vapor cools and forms drops.", "Water keeps moving between Earth and air."],
      misconceptions: ["Clouds are not smoke.", "Rain water does not disappear forever."],
      differentiatedSupport: "Use short lines, numbered steps, and repeated keywords."
    },
    studentAccessPack: {
      screenReaderSummary: "The water cycle is the movement of water from Earth to air and back again.",
      audioStudyScript:
        "The sun heats water in rivers and lakes. Some water becomes vapor and rises. The vapor cools and forms clouds. When the clouds become heavy, water falls as rain.",
      visualDescription:
        "The diagram shows water at the bottom, a sun above it, a cloud near the top, and arrows showing water moving up and rain moving down.",
      vocabulary: [
        { term: "Evaporation", meaning: "Water changes into vapor." },
        { term: "Condensation", meaning: "Vapor cools and becomes tiny drops." },
        { term: "Precipitation", meaning: "Water falls from clouds as rain." }
      ],
      steps: ["Sun heats water.", "Water vapor rises.", "Clouds form.", "Rain falls."],
      practiceQuestions: ["What heats the water?", "What falls from clouds?"],
      selfCheckAnswers: ["The sun.", "Rain."]
    },
    trustPack: {
      runtimeMode: "Local Ollama",
      model: "Gemma local proof",
      latency: "2.4s",
      schemaStatus: "Valid",
      teacherReviewStatus: "Review Required",
      confidence: 86,
      accessibilityWarnings: ["Top label is partly cropped."]
    },
    safetyFlags: {
      sourceUnclear: true,
      possibleOcrError: false,
      teacherReviewRequired: true
    }
  }
];

export const featuredLessonPack = lessonPacks[0];
