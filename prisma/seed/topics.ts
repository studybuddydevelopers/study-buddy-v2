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
};
