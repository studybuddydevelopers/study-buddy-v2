export type TopicSeed = { title: string; sortOrder: number };

// WAEC Mathematics syllabus topics (Paper 1 & 2 scope)
export const topicsBySubject: Record<string, TopicSeed[]> = {
  "WAEC Mathematics": [
    { title: "Number & Numeration", sortOrder: 0 },
    { title: "Algebraic Processes", sortOrder: 1 },
    { title: "Mensuration", sortOrder: 2 },
    { title: "Geometry & Trigonometry", sortOrder: 3 },
    { title: "Statistics & Probability", sortOrder: 4 },
    { title: "Variation & Graphs", sortOrder: 5 },
    { title: "Vectors & Transformation", sortOrder: 6 },
    { title: "Commercial Arithmetic", sortOrder: 7 },
    { title: "Sets & Venn Diagrams", sortOrder: 8 },
    { title: "Sequences & Series", sortOrder: 9 },
  ],

  // WAEC Biology — Section A (common to all candidates)
  "WAEC Biology": [
    { title: "Cell Biology and Living Things", sortOrder: 0 },
    { title: "Nutrition in Plants and Animals", sortOrder: 1 },
    { title: "Respiration and Gaseous Exchange", sortOrder: 2 },
    { title: "Transport Systems", sortOrder: 3 },
    { title: "Excretion and Homeostasis", sortOrder: 4 },
    { title: "Growth, Development and Reproduction", sortOrder: 5 },
    { title: "Support and Movement", sortOrder: 6 },
    { title: "Coordination and Control", sortOrder: 7 },
    { title: "Ecology and the Environment", sortOrder: 8 },
    { title: "Genetics, Variation and Evolution", sortOrder: 9 },
  ],

  // WAEC Economics — full syllabus topics
  "WAEC Economics": [
    { title: "Basic Economic Concepts and Systems", sortOrder: 0 },
    { title: "Demand, Supply and Price Determination", sortOrder: 1 },
    { title: "Theory of Consumer Behaviour", sortOrder: 2 },
    { title: "Theory of Production, Cost and Revenue", sortOrder: 3 },
    { title: "Market Structures", sortOrder: 4 },
    { title: "Business Organisations and Distributive Trade", sortOrder: 5 },
    { title: "Population and the Labour Market", sortOrder: 6 },
    { title: "Agriculture and Industrialisation", sortOrder: 7 },
    { title: "Money, Banking and Inflation", sortOrder: 8 },
    { title: "Public Finance and Taxation", sortOrder: 9 },
    { title: "National Income and Economic Development", sortOrder: 10 },
    { title: "International Trade and Economic Integration", sortOrder: 11 },
  ],
};
