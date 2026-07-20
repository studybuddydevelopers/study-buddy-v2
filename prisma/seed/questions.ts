import { Prisma } from "@prisma/client";

type ResolvableQuestion = Omit<Prisma.PastQuestionCreateManyInput, "subjectId" | "topicId"> & {
  subjectName: string;
  topicTitle: string;
};

// ── Number & Numeration ──────────────────────────────────────────────────────

const numberNumeration = (count: number): ResolvableQuestion[] => {
  const items: ResolvableQuestion[] = [];

  // Fractions / LCM / HCF
  const fractionPairs = [
    [12, 18, 6], [24, 36, 12], [15, 25, 5], [8, 20, 4], [14, 21, 7],
    [30, 45, 15], [16, 24, 8], [9, 27, 9], [10, 35, 5], [6, 14, 2],
  ];
  for (let i = 0; i < Math.min(count, fractionPairs.length); i++) {
    const [a, b, hcf] = fractionPairs[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Number & Numeration",
      questionText: `Find the HCF of ${a} and ${b}.`,
      answerText: String(hcf),
      explanationText: `List factors of ${a} and ${b} and identify the greatest common factor.`,
      difficulty: 1,
    });
  }

  // Indices / Laws of indices
  const indexItems = [
    ["2^3 × 2^4", "2^7", "128", "Add exponents: 3+4=7, so 2^7 = 128."],
    ["3^5 ÷ 3^2", "3^3", "27", "Subtract exponents: 5-2=3, so 3^3 = 27."],
    ["(4^2)^3", "4^6", "4096", "Multiply exponents: 2×3=6, so 4^6 = 4096."],
    ["5^0", "1", "1", "Any non-zero base raised to the power 0 equals 1."],
    ["2^(-3)", "1/8", "1/8", "Negative exponent: 2^(-3) = 1/(2^3) = 1/8."],
    ["(16)^(1/2)", "4", "4", "Square root of 16 is 4."],
    ["(27)^(1/3)", "3", "3", "Cube root of 27 is 3."],
    ["(64)^(2/3)", "16", "16", "64^(1/3) = 4, then 4^2 = 16."],
    ["2^4 × 2^(-2)", "2^2", "4", "Add exponents: 4+(-2)=2, so 2^2 = 4."],
    ["(9)^(3/2)", "27", "27", "9^(1/2)=3, then 3^3=27."],
  ];
  for (let i = 0; i < Math.min(count - items.length, indexItems.length); i++) {
    const [expr, simplified, answer, explanation] = indexItems[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Number & Numeration",
      questionText: `Simplify: ${expr}`,
      answerText: answer,
      explanationText: explanation,
      difficulty: 2,
    });
  }

  // Number bases
  const basePairs: [string, number, string, string][] = [
    ["1011₂", 2, "11", "1×8+0×4+1×2+1×1 = 11"],
    ["1101₂", 2, "13", "1×8+1×4+0×2+1×1 = 13"],
    ["23₅", 5, "13", "2×5+3 = 13"],
    ["44₅", 5, "24", "4×5+4 = 24"],
    ["34₈", 8, "28", "3×8+4 = 28"],
    ["17₈", 8, "15", "1×8+7 = 15"],
    ["1FE₁₆", 16, "510", "1×256+15×16+14 = 510"],
    ["10111₂", 2, "23", "16+4+2+1 = 23"],
    ["312₄", 4, "54", "3×16+1×4+2 = 54"],
    ["21₃", 3, "7", "2×3+1 = 7"],
  ];
  for (let i = 0; i < Math.min(count - items.length, basePairs.length); i++) {
    const [numStr, , answer, explanation] = basePairs[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Number & Numeration",
      questionText: `Convert ${numStr} to base 10.`,
      answerText: answer,
      explanationText: explanation,
      difficulty: 2,
    });
  }

  return items.slice(0, count);
};

// ── Algebraic Processes ──────────────────────────────────────────────────────

const algebraicProcesses = (count: number): ResolvableQuestion[] => {
  const items: ResolvableQuestion[] = [];

  // Linear equations
  for (let i = 0; i < Math.min(count, 15); i++) {
    const a = 2 + (i % 8);
    const b = 1 + ((i * 3) % 12);
    const c = 10 + ((i * 5) % 35);
    const x = (c - b) / a;
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Algebraic Processes",
      questionText: `Solve for x: ${a}x + ${b} = ${c}`,
      answerText: String(x),
      explanationText: `Subtract ${b} from both sides: ${a}x = ${c - b}. Divide by ${a}: x = ${x}.`,
      difficulty: 1,
    });
  }

  // Quadratic equations
  const quadratics = [
    ["x^2 - 5x + 6 = 0", "x = 2 or x = 3", "Factor: (x-2)(x-3)=0"],
    ["x^2 - 7x + 12 = 0", "x = 3 or x = 4", "Factor: (x-3)(x-4)=0"],
    ["x^2 + 5x + 6 = 0", "x = -2 or x = -3", "Factor: (x+2)(x+3)=0"],
    ["x^2 - x - 6 = 0", "x = 3 or x = -2", "Factor: (x-3)(x+2)=0"],
    ["2x^2 - 5x + 2 = 0", "x = 2 or x = 1/2", "Factor: (2x-1)(x-2)=0"],
    ["x^2 - 9 = 0", "x = 3 or x = -3", "Difference of squares: (x-3)(x+3)=0"],
    ["x^2 + 3x - 10 = 0", "x = 2 or x = -5", "Factor: (x+5)(x-2)=0"],
    ["3x^2 - 7x + 2 = 0", "x = 2 or x = 1/3", "Factor: (3x-1)(x-2)=0"],
    ["x^2 - 4x + 4 = 0", "x = 2", "Perfect square: (x-2)^2=0"],
    ["x^2 - 16 = 0", "x = 4 or x = -4", "Difference of squares: (x-4)(x+4)=0"],
  ];
  for (let i = 0; i < Math.min(count - items.length, quadratics.length); i++) {
    const [q, ans, exp] = quadratics[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Algebraic Processes",
      questionText: `Solve: ${q}`,
      answerText: ans,
      explanationText: exp,
      difficulty: 2,
    });
  }

  // Simultaneous equations
  const simul = [
    ["2x + y = 7", "x - y = 1", "x = 8/3, y = 5/3", "Add the equations: 3x = 8, x = 8/3; substitute to find y."],
    ["x + y = 5", "x - y = 1", "x = 3, y = 2", "Add: 2x = 6, x = 3; then y = 2."],
    ["3x + 2y = 12", "x + y = 5", "x = 2, y = 3", "Subtract: 2x - y = 7; combine with x+y=5 to get x=2."],
    ["2x - y = 3", "x + 2y = 9", "x = 3, y = 3", "From first: y=2x-3; substitute into second."],
    ["4x + 3y = 18", "2x - y = 4", "x = 3, y = 2", "Double second eq: 4x-2y=8; subtract from first: 5y=10, y=2."],
  ];
  for (let i = 0; i < Math.min(count - items.length, simul.length); i++) {
    const [eq1, eq2, ans, exp] = simul[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Algebraic Processes",
      questionText: `Solve simultaneously: ${eq1} and ${eq2}`,
      answerText: ans,
      explanationText: exp,
      difficulty: 3,
    });
  }

  return items.slice(0, count);
};

// ── Mensuration ──────────────────────────────────────────────────────────────

const mensuration = (count: number): ResolvableQuestion[] => {
  const items: ResolvableQuestion[] = [];

  // Area / Perimeter
  const shapes = [
    ["rectangle", "8 cm by 5 cm", "Area = 40 cm², Perimeter = 26 cm", "Area = l×b = 8×5 = 40; Perimeter = 2(l+b) = 2(13) = 26."],
    ["triangle", "base 10 cm, height 6 cm", "Area = 30 cm²", "Area = ½ × base × height = ½ × 10 × 6 = 30."],
    ["circle", "radius 7 cm (take π = 22/7)", "Area = 154 cm²", "Area = πr² = (22/7) × 49 = 154 cm²."],
    ["trapezium", "parallel sides 8 cm and 12 cm, height 5 cm", "Area = 50 cm²", "Area = ½(a+b)h = ½(8+12)×5 = 50."],
    ["parallelogram", "base 9 cm, height 4 cm", "Area = 36 cm²", "Area = base × height = 9 × 4 = 36."],
    ["circle", "diameter 14 cm (take π = 22/7)", "Circumference = 44 cm", "C = πd = (22/7) × 14 = 44 cm."],
    ["cuboid", "dimensions 4 cm × 3 cm × 2 cm", "Volume = 24 cm³", "Volume = l × w × h = 4 × 3 × 2 = 24."],
    ["cylinder", "radius 3.5 cm, height 10 cm (π = 22/7)", "Volume = 385 cm³", "V = πr²h = (22/7) × 12.25 × 10 = 385."],
    ["cone", "radius 6 cm, height 8 cm (π = 22/7)", "Volume = 301.7 cm³", "V = ⅓πr²h = ⅓ × (22/7) × 36 × 8 ≈ 301.7."],
    ["sphere", "radius 3 cm (π = 22/7)", "Volume = 113.1 cm³", "V = (4/3)πr³ = (4/3) × (22/7) × 27 ≈ 113.1."],
  ];
  for (let i = 0; i < Math.min(count, shapes.length); i++) {
    const [shape, dims, ans, exp] = shapes[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Mensuration",
      questionText: `Find the area/volume of a ${shape} with ${dims}.`,
      answerText: ans,
      explanationText: exp,
      difficulty: 2 + (i % 2),
    });
  }

  // Pythagorean theorem
  for (let i = 0; i < Math.min(count - items.length, 10); i++) {
    const a = 3 + (i % 10);
    const b = 4 + ((i * 2) % 12);
    const hyp = Math.sqrt(a * a + b * b);
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Mensuration",
      questionText: `A right triangle has legs ${a} cm and ${b} cm. Find the hypotenuse.`,
      answerText: Number.isInteger(hyp) ? String(hyp) : hyp.toFixed(2),
      explanationText: `Use Pythagoras: c = √(${a}² + ${b}²) = √${a * a + b * b} ≈ ${hyp.toFixed(2)}.`,
      difficulty: 2,
    });
  }

  return items.slice(0, count);
};

// ── Statistics & Probability ─────────────────────────────────────────────────

const statisticsProbability = (count: number): ResolvableQuestion[] => {
  const items: ResolvableQuestion[] = [];

  // Mean calculation
  const dataSets = [
    [[4, 6, 8, 10, 12], 8],
    [[5, 7, 9, 11, 13], 9],
    [[2, 4, 6, 8, 10], 6],
    [[3, 6, 9, 12, 15], 9],
    [[10, 20, 30, 40, 50], 30],
    [[1, 3, 5, 7, 9], 5],
    [[12, 14, 16, 18, 20], 16],
    [[7, 14, 21, 28, 35], 21],
    [[4, 8, 12, 16, 20], 12],
    [[2, 5, 8, 11, 14], 8],
  ];
  for (let i = 0; i < Math.min(count, dataSets.length); i++) {
    const [data, mean] = dataSets[i];
    const arr = data as number[];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Statistics & Probability",
      questionText: `Find the mean of the following data: ${arr.join(", ")}.`,
      answerText: String(mean),
      explanationText: `Sum = ${arr.reduce((a, b) => a + b, 0)}, Count = ${arr.length}. Mean = Sum ÷ Count = ${mean}.`,
      difficulty: 1,
    });
  }

  // Probability
  const probItems = [
    ["A bag contains 3 red, 4 blue, and 5 green balls. A ball is picked at random. What is the probability of picking a red ball?", "3/12 = 1/4", "P(red) = 3/12 = 1/4."],
    ["A fair die is tossed once. What is the probability of getting an even number?", "3/6 = 1/2", "Even numbers: 2,4,6. P = 3/6 = 1/2."],
    ["A card is drawn from a standard deck of 52 cards. What is the probability of drawing a king?", "4/52 = 1/13", "There are 4 kings. P = 4/52 = 1/13."],
    ["A coin is tossed twice. What is the probability of getting two heads?", "1/4", "P(HH) = (1/2)(1/2) = 1/4."],
    ["In a class of 30 students, 18 are girls. A student is chosen at random. What is the probability of choosing a boy?", "12/30 = 2/5", "Boys = 30-18 = 12. P = 12/30 = 2/5."],
    ["A bag has 5 white and 3 black balls. What is the probability of picking a black ball?", "3/8", "P(black) = 3/(5+3) = 3/8."],
    ["A fair die is thrown once. What is the probability of getting a number greater than 4?", "2/6 = 1/3", "Numbers > 4: {5,6}. P = 2/6 = 1/3."],
    ["Two coins are tossed. What is the probability of getting at least one head?", "3/4", "Outcomes: HH,HT,TH,TT. Favourable: HH,HT,TH = 3. P = 3/4."],
  ];
  for (let i = 0; i < Math.min(count - items.length, probItems.length); i++) {
    const [q, ans, exp] = probItems[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Statistics & Probability",
      questionText: q,
      answerText: ans,
      explanationText: exp,
      difficulty: 2,
    });
  }

  return items.slice(0, count);
};

// ── Commercial Arithmetic ────────────────────────────────────────────────────

const commercialArithmetic = (count: number): ResolvableQuestion[] => {
  const items: ResolvableQuestion[] = [];

  const questions = [
    ["A trader bought goods for ₦4,000 and sold them for ₦5,200. Find the profit percent.", "30%", "Profit = ₦1,200. Profit% = (1200/4000)×100 = 30%."],
    ["An article is sold for ₦3,600 at a loss of 10%. Find the cost price.", "₦4,000", "CP = SP ÷ (1 - loss%) = 3600 ÷ 0.9 = ₦4,000."],
    ["Find the simple interest on ₦5,000 at 8% per annum for 3 years.", "₦1,200", "SI = PRT/100 = 5000×8×3/100 = ₦1,200."],
    ["A principal of ₦2,000 is invested at 5% compound interest for 2 years. Find the amount.", "₦2,205", "A = P(1+r/100)^n = 2000×(1.05)^2 = ₦2,205."],
    ["A television set is bought for ₦18,000 and sold at a profit of 15%. Find the selling price.", "₦20,700", "SP = CP×(1 + profit%) = 18000×1.15 = ₦20,700."],
    ["A car worth ₦500,000 depreciates at 10% per annum. What is its value after 2 years?", "₦405,000", "Value = 500000×(0.9)^2 = 500000×0.81 = ₦405,000."],
    ["Find the compound interest on ₦10,000 at 10% per annum for 2 years.", "₦2,100", "A = 10000×(1.1)^2 = 12,100. CI = 12,100 - 10,000 = ₦2,100."],
    ["A sales tax of 5% is added to an item priced at ₦8,000. What is the final cost?", "₦8,400", "Tax = 5% × 8000 = 400. Final cost = 8000 + 400 = ₦8,400."],
    ["A worker earns ₦24,000 per month. He pays 7.5% as income tax. Find his monthly tax.", "₦1,800", "Tax = 7.5/100 × 24,000 = ₦1,800."],
    ["The hire purchase price of a phone is ₦2,000 deposit plus 12 monthly payments of ₦800. What is the total hire purchase price?", "₦11,600", "Total = 2000 + (12 × 800) = 2000 + 9600 = ₦11,600."],
  ];

  for (let i = 0; i < Math.min(count, questions.length); i++) {
    const [q, ans, exp] = questions[i];
    items.push({
      subjectName: "WAEC Mathematics",
      topicTitle: "Commercial Arithmetic",
      questionText: q,
      answerText: ans,
      explanationText: exp,
      difficulty: 2 + (i % 2),
    });
  }

  return items.slice(0, count);
};

// ── Geometry & Trigonometry ──────────────────────────────────────────────────

const geometryTrigonometry = (count: number): ResolvableQuestion[] => {
  const questions = [
    ["Find angle x if two angles of a triangle are 50° and 70°.", "60°", "Angles in a triangle sum to 180°: x = 180 - 50 - 70 = 60°."],
    ["The angles of a quadrilateral are x, 2x, 3x, and 4x. Find x.", "36°", "Sum = 360°: 10x = 360, x = 36°."],
    ["Find the exterior angle of a regular hexagon.", "60°", "Exterior angle = 360° ÷ 6 = 60°."],
    ["In a right triangle, sin(30°) = 0.5. Find the side opposite the 30° angle if the hypotenuse is 10 cm.", "5 cm", "Opposite = hyp × sin(30°) = 10 × 0.5 = 5 cm."],
    ["Find the length of the arc of a circle of radius 7 cm that subtends an angle of 90° at the centre. (π = 22/7)", "11 cm", "Arc = (θ/360) × 2πr = (90/360) × 2 × (22/7) × 7 = 11 cm."],
    ["A ladder 10 m long leans against a wall. The foot is 6 m from the wall. How high up the wall does it reach?", "8 m", "h = √(10² - 6²) = √(100-36) = √64 = 8 m."],
    ["Find the interior angle of a regular pentagon.", "108°", "Interior angle = (5-2)×180 ÷ 5 = 540 ÷ 5 = 108°."],
    ["Two supplementary angles are in the ratio 2:3. Find the larger angle.", "108°", "Sum = 180°. Larger = (3/5) × 180 = 108°."],
    ["The angle of elevation of the top of a pole from a point 20 m away is 30°. Find the height of the pole. (tan 30° = 1/√3 ≈ 0.577)", "11.55 m", "h = 20 × tan(30°) = 20 × 0.577 ≈ 11.55 m."],
    ["Find the area of a sector of a circle with radius 6 cm and angle 60°. (π = 22/7)", "18.86 cm²", "Area = (θ/360) × πr² = (60/360) × (22/7) × 36 ≈ 18.86 cm²."],
  ];

  return questions.slice(0, count).map(([q, ans, exp]) => ({
    subjectName: "WAEC Mathematics",
    topicTitle: "Geometry & Trigonometry",
    questionText: q,
    answerText: ans,
    explanationText: exp,
    difficulty: 2,
  }));
};

// ── Sets & Venn Diagrams ─────────────────────────────────────────────────────

const setsVennDiagrams = (count: number): ResolvableQuestion[] => {
  const questions = [
    ["If A = {1, 2, 3, 4} and B = {3, 4, 5, 6}, find A ∪ B.", "{1, 2, 3, 4, 5, 6}", "The union contains all elements from both sets without repetition."],
    ["If A = {1, 2, 3, 4} and B = {3, 4, 5, 6}, find A ∩ B.", "{3, 4}", "The intersection contains elements common to both sets."],
    ["If A = {2, 4, 6, 8, 10} and B = {1, 2, 3, 4, 5}, find A ∩ B.", "{2, 4}", "Common elements: 2 and 4."],
    ["In a class of 40 students, 25 study Maths, 20 study English, and 10 study both. How many study neither?", "5", "n(M ∪ E) = 25+20-10 = 35. Neither = 40 - 35 = 5."],
    ["If n(A) = 12, n(B) = 15, and n(A ∩ B) = 5, find n(A ∪ B).", "22", "n(A ∪ B) = 12 + 15 - 5 = 22."],
    ["If U = {1,2,3,4,5,6,7,8} and A = {2,4,6,8}, find A' (complement of A).", "{1, 3, 5, 7}", "The complement contains elements in U but not in A."],
    ["In a survey, 30 people like tea, 20 like coffee, and 10 like both. How many like at least one?", "40", "n(T ∪ C) = 30 + 20 - 10 = 40."],
    ["If A = {a, b, c} and B = {b, c, d, e}, find n(A ∪ B).", "5", "A ∪ B = {a,b,c,d,e}. n = 5."],
  ];

  return questions.slice(0, count).map(([q, ans, exp]) => ({
    subjectName: "WAEC Mathematics",
    topicTitle: "Sets & Venn Diagrams",
    questionText: q,
    answerText: ans,
    explanationText: exp,
    difficulty: 2,
  }));
};

// ── Sequences & Series ───────────────────────────────────────────────────────

const sequencesSeries = (count: number): ResolvableQuestion[] => {
  const questions = [
    ["Find the 10th term of the AP: 3, 7, 11, 15, ...", "39", "a=3, d=4. T_n = a+(n-1)d = 3+9×4 = 39."],
    ["Find the sum of the first 10 terms of the AP: 2, 5, 8, 11, ...", "155", "S_n = n/2(2a+(n-1)d) = 10/2(4+27) = 5×31 = 155."],
    ["The 5th term of an AP is 17 and the 8th term is 26. Find the first term.", "5", "d = (26-17)/(8-5) = 3. a = 17 - 4×3 = 5."],
    ["Find the 5th term of the GP: 2, 6, 18, ...", "162", "a=2, r=3. T_5 = ar^4 = 2×81 = 162."],
    ["Find the sum of the first 5 terms of the GP: 1, 2, 4, 8, ...", "31", "S_n = a(r^n-1)/(r-1) = 1(32-1)/1 = 31."],
    ["The common ratio of a GP is 2 and the first term is 3. Find the 6th term.", "96", "T_6 = 3 × 2^5 = 3 × 32 = 96."],
    ["How many terms are in the AP: 4, 9, 14, ..., 54?", "11", "T_n = 4 + (n-1)5 = 54 → (n-1) = 10 → n = 11."],
    ["Find the common difference of an AP where the 3rd term is 10 and the 7th term is 22.", "3", "d = (22-10)/(7-3) = 12/4 = 3."],
  ];

  return questions.slice(0, count).map(([q, ans, exp]) => ({
    subjectName: "WAEC Mathematics",
    topicTitle: "Sequences & Series",
    questionText: q,
    answerText: ans,
    explanationText: exp,
    difficulty: 2,
  }));
};

export const questions: ResolvableQuestion[] = [
  ...numberNumeration(30),
  ...algebraicProcesses(30),
  ...mensuration(20),
  ...statisticsProbability(20),
  ...commercialArithmetic(10),
  ...geometryTrigonometry(10),
  ...setsVennDiagrams(8),
  ...sequencesSeries(8),
];
