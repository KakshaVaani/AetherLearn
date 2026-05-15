import { Lecture } from "@/types";

export const lectures: Lecture[] = [
  {
    id: "photosynthesis",
    title: "Photosynthesis and Plant Nutrition",
    subject: "Science",
    source: "Biology slide with plant diagram",
    sourceType: "Biology slide with diagram",
    postedAt: "2026-05-13T09:00:00.000Z",
    teacherPdf: {
      fileName: "photosynthesis-plant-nutrition.pdf",
      pageCount: 8,
      uploadedAt: "May 13, 2026"
    },
    teacherNotes:
      "Today we learned how green plants prepare food. Focus on the inputs: sunlight, water, and carbon dioxide. Also remember the outputs: glucose for the plant and oxygen released into the air.",
    status: "Gemma 4 analysis complete",
    badge: "Cloud generated",
    diagramDescription:
      "A green plant is shown with sunlight coming from above, roots absorbing water from the soil, leaves taking in carbon dioxide, and oxygen moving back into the air.",
    keyVocabulary: ["Photosynthesis", "Chlorophyll", "Glucose", "Carbon dioxide", "Oxygen"],
    practiceQuestions: [
      "What do plants need to make food?",
      "What gas do plants release during photosynthesis?",
      "Where does water enter the plant?"
    ],
    outputs: {
      standard:
        "Photosynthesis is the process by which green plants make food using sunlight, water, and carbon dioxide.",
      blindLowVision:
        "This diagram shows a green plant receiving sunlight from above. The roots absorb water from the soil. The leaves take in carbon dioxide from the air. Inside the leaves, the plant makes glucose and releases oxygen.",
      dyslexiaFriendly:
        "Plants make their own food.\nThey use sunlight, water, and carbon dioxide.\nThis process is called photosynthesis.\nOxygen is released into the air.",
      multilingual:
        "Plants apna food khud banate hain. Is process ko photosynthesis kehte hain. Plant sunlight, water aur carbon dioxide use karta hai, phir glucose banata hai aur oxygen release karta hai.",
      slowLearner:
        "1. Roots take water from soil.\n2. Leaves take carbon dioxide from air.\n3. Sunlight gives energy.\n4. Plant makes glucose.\n5. Oxygen goes back into air."
    }
  },
  {
    id: "fractions",
    title: "Fractions on a Number Line",
    subject: "Math",
    source: "Worksheet scan",
    sourceType: "Math worksheet",
    postedAt: "2026-05-12T10:30:00.000Z",
    teacherPdf: {
      fileName: "fractions-number-line-practice.pdf",
      pageCount: 5,
      uploadedAt: "May 12, 2026"
    },
    teacherNotes:
      "A fraction can be placed on a number line by dividing the space between whole numbers into equal parts. Count the parts carefully from zero to find the correct point.",
    status: "Gemma 4 analysis complete",
    badge: "Saved offline",
    diagramDescription:
      "A horizontal number line is divided into equal parts from zero to one, showing one-half and one-quarter as marked points.",
    keyVocabulary: ["Numerator", "Denominator", "Equal parts", "Number line"],
    practiceQuestions: [
      "Which fraction is halfway between 0 and 1?",
      "How many equal parts are in fourths?",
      "Mark three-fourths on a number line."
    ],
    outputs: {
      standard:
        "A fraction shows part of a whole. On a number line, fractions sit between whole numbers based on equal parts.",
      blindLowVision:
        "Imagine a straight line from zero to one. The line is split into four equal spaces. One-quarter is after the first space, one-half is after the second space, and three-quarters is after the third space.",
      dyslexiaFriendly:
        "Fractions are parts of one whole.\nA number line can show those parts.\nEqual spaces help us place each fraction.",
      multilingual:
        "Fraction ka matlab hota hai whole ka ek part. Number line par fraction ko equal parts ke hisaab se place karte hain.",
      slowLearner:
        "1. Draw a line from 0 to 1.\n2. Split it into equal parts.\n3. Count the parts from 0.\n4. Place the fraction at the right count."
    }
  }
];

export const featuredLecture = lectures[0];
