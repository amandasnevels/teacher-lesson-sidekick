/**
 * Quick Fact Game content: original question/answer pairs by grade band and subject,
 * plus generated math questions per grade band. Works offline; no external content.
 */
import { randomInt, shuffle } from "@/lib/random";

export type GradeBand = "K-2" | "3-5" | "6-8" | "9-12";
export type QuizSubject = "math" | "science" | "social" | "ela" | "mixed" | "custom";

export const GRADE_BANDS: { value: GradeBand; label: string }[] = [
  { value: "K-2", label: "K–2" },
  { value: "3-5", label: "3–5" },
  { value: "6-8", label: "6–8" },
  { value: "9-12", label: "9–12" },
];

export const SUBJECTS: { value: QuizSubject; label: string; emoji: string }[] = [
  { value: "math", label: "Math", emoji: "➗" },
  { value: "science", label: "Science", emoji: "🔬" },
  { value: "social", label: "Social Studies", emoji: "🌎" },
  { value: "ela", label: "ELA", emoji: "📚" },
  { value: "mixed", label: "Mixed", emoji: "🎲" },
  { value: "custom", label: "My questions", emoji: "✏️" },
];

export interface QuizQuestion {
  id: string;
  q: string;
  a: string;
  subject: Exclude<QuizSubject, "mixed" | "custom"> | "custom";
}

type Bank = Record<"science" | "social" | "ela", Record<GradeBand, [string, string][]>>;

const BANK: Bank = {
  science: {
    "K-2": [
      ["What do plants need from the sky to make their food?", "Sunlight"],
      ["How many legs does an insect have?", "6"],
      ["What is the closest star to Earth?", "The Sun"],
      ["What do we call water when it freezes?", "Ice"],
      ["Which season comes after winter?", "Spring"],
      ["What part of a plant takes in water from the soil?", "The roots"],
      ["What gas do people need to breathe in to live?", "Oxygen"],
      ["What does a caterpillar turn into?", "A butterfly or moth"],
      ["What do we call an animal that eats only plants?", "A herbivore"],
      ["Which sense do you use with your nose?", "Smell"],
      ["What do baby frogs that live in water start out as?", "Tadpoles"],
      ["What do we call frozen rain that falls as soft white flakes?", "Snow"],
    ],
    "3-5": [
      ["What are the three main states of matter?", "Solid, liquid, gas"],
      ["What force pulls objects toward Earth?", "Gravity"],
      ["Which planet is known as the Red Planet?", "Mars"],
      ["What is the largest planet in our solar system?", "Jupiter"],
      ["What process do plants use to make food from sunlight?", "Photosynthesis"],
      ["What do we call an animal with a backbone?", "A vertebrate"],
      ["What is it called when water vapor turns back into liquid?", "Condensation"],
      ["How many planets are in our solar system?", "8"],
      ["What organ pumps blood through your body?", "The heart"],
      ["What kind of rock forms when lava or magma cools?", "Igneous rock"],
      ["What do we call the path a planet takes around the Sun?", "An orbit"],
      ["What gas do plants take in from the air?", "Carbon dioxide"],
    ],
    "6-8": [
      ["What is the basic unit of life?", "The cell"],
      ["Which part of a plant or animal cell holds the DNA?", "The nucleus"],
      ["What is the chemical formula for water?", "H₂O"],
      ["What is the chemical symbol for sodium?", "Na"],
      ["Which organelle is called the powerhouse of the cell?", "The mitochondria"],
      ["Which layer of Earth do we live on?", "The crust"],
      ["Newton's first law of motion is also called the law of…?", "Inertia"],
      ["What is the pH of pure water?", "7 (neutral)"],
      ["What causes the seasons on Earth?", "The tilt of Earth's axis"],
      ["What type of energy is stored in food?", "Chemical energy"],
      ["What do we call an organism that makes its own food?", "A producer"],
      ["What is the boundary where two tectonic plates meet called?", "A plate boundary (fault)"],
    ],
    "9-12": [
      ["What is the atomic number of carbon?", "6"],
      ["About how fast does light travel in a vacuum?", "About 300,000 km per second (3 × 10⁸ m/s)"],
      ["What molecule carries genetic information?", "DNA"],
      ["What are the building blocks of proteins?", "Amino acids"],
      ["Write Newton's second law as an equation.", "F = ma"],
      ["What is the SI unit of force?", "The newton (N)"],
      ["Which subatomic particle has a negative charge?", "The electron"],
      ["About what is Avogadro's number?", "6.02 × 10²³"],
      ["What kind of chemical bond shares electrons?", "A covalent bond"],
      ["What type of cell division makes gametes with half the chromosomes?", "Meiosis"],
      ["What is the SI unit of energy?", "The joule (J)"],
      ["What gas makes up most of Earth's atmosphere?", "Nitrogen"],
    ],
  },
  social: {
    "K-2": [
      ["How many continents are there?", "7"],
      ["What part of a map explains its symbols?", "The map key (legend)"],
      ["Which direction is the opposite of north?", "South"],
      ["What do we call the leader of a city?", "The mayor"],
      ["What is the largest ocean?", "The Pacific Ocean"],
      ["What are the four main directions?", "North, south, east, west"],
      ["What shape is a globe?", "A sphere (a ball)"],
      ["What do we call money you keep instead of spending?", "Savings"],
      ["What do we call a person who grows food on a farm?", "A farmer"],
      ["What is a model of Earth that is round called?", "A globe"],
      ["What holiday celebrates the United States becoming independent?", "Independence Day (July 4)"],
      ["What do we call things we need to live, like food and shelter?", "Needs"],
    ],
    "3-5": [
      ["What is the capital of the United States?", "Washington, D.C."],
      ["Who was the first President of the United States?", "George Washington"],
      ["Which document begins with “We the People”?", "The U.S. Constitution"],
      ["How many states are in the United States?", "50"],
      ["Which ocean is on the east coast of the United States?", "The Atlantic Ocean"],
      ["What are the three branches of the U.S. government?", "Legislative, executive, judicial"],
      ["In what year was the Declaration of Independence signed?", "1776"],
      ["Which lines on a map run east–west and measure distance from the equator?", "Lines of latitude"],
      ["What is the largest continent?", "Asia"],
      ["What do we call a person who moves to a new country to live?", "An immigrant"],
      ["What imaginary line divides Earth into Northern and Southern Hemispheres?", "The equator"],
      ["Which branch of government makes the laws?", "The legislative branch (Congress)"],
    ],
    "6-8": [
      ["Which ancient civilization built the pyramids at Giza?", "Ancient Egypt"],
      ["Which river did ancient Egypt depend on?", "The Nile"],
      ["Who wrote most of the Declaration of Independence?", "Thomas Jefferson"],
      ["What are the first ten amendments to the Constitution called?", "The Bill of Rights"],
      ["What is the line at 0° longitude called?", "The Prime Meridian"],
      ["Which ancient Greek city-state is known as the birthplace of democracy?", "Athens"],
      ["How many U.S. senators does each state have?", "2"],
      ["What trade route linked China with the Mediterranean world?", "The Silk Road"],
      ["Which amendment abolished slavery in the United States?", "The 13th Amendment"],
      ["What city was the capital of the Roman Empire?", "Rome"],
      ["What do we call a government ruled by a king or queen?", "A monarchy"],
      ["What do we call the system of checks between government branches?", "Checks and balances"],
    ],
    "9-12": [
      ["In what year did World War II end?", "1945"],
      ["Which 1954 Supreme Court case ruled school segregation unconstitutional?", "Brown v. Board of Education"],
      ["What economic term means a general rise in prices?", "Inflation"],
      ["How many justices sit on the U.S. Supreme Court?", "9"],
      ["What wall fell in 1989, symbolizing the end of the Cold War?", "The Berlin Wall"],
      ["What document did King John of England agree to in 1215?", "The Magna Carta"],
      ["How long is a U.S. senator's term?", "6 years"],
      ["What does GDP stand for?", "Gross Domestic Product"],
      ["Who was President during the U.S. Civil War?", "Abraham Lincoln"],
      ["Which amendment guaranteed women the right to vote?", "The 19th Amendment"],
      ["What do economists call the amount of a good people are willing to buy?", "Demand"],
      ["Which U.S. president gave the Gettysburg Address?", "Abraham Lincoln"],
    ],
  },
  ela: {
    "K-2": [
      ["How many letters are in the English alphabet?", "26"],
      ["Name the five vowels.", "A, E, I, O, U"],
      ["What punctuation mark ends a question?", "A question mark (?)"],
      ["What do we call a word that names a person, place, or thing?", "A noun"],
      ["What is the opposite of “hot”?", "Cold"],
      ["What letter comes after M?", "N"],
      ["Which word rhymes with “cat”: dog, hat, or sun?", "Hat"],
      ["What do we call a word that shows action?", "A verb"],
      ["What is the plural of “child”?", "Children"],
      ["What kind of letter should start every sentence?", "A capital letter"],
      ["What do we call the person who writes a book?", "The author"],
      ["What do we call the person who draws the pictures in a book?", "The illustrator"],
    ],
    "3-5": [
      ["What do we call words that mean the same thing?", "Synonyms"],
      ["What do we call words with opposite meanings?", "Antonyms"],
      ["What kind of word describes a noun?", "An adjective"],
      ["What is the plural of “mouse”?", "Mice"],
      ["Where and when a story happens is called the…?", "Setting"],
      ["What punctuation mark is used in a contraction like “don't”?", "An apostrophe"],
      ["What is a true story of a person's life written by someone else?", "A biography"],
      ["Which part of a book explains the meanings of hard words?", "The glossary"],
      ["What do we call the problem in a story?", "The conflict"],
      ["What kind of word describes a verb, like “quickly”?", "An adverb"],
      ["What is a story someone writes about their own life?", "An autobiography"],
      ["Words that sound the same but have different meanings are called…?", "Homophones"],
    ],
    "6-8": [
      ["What figure of speech compares using “like” or “as”?", "A simile"],
      ["What is it called when non-human things are given human qualities?", "Personification"],
      ["What is the turning point of a story called?", "The climax"],
      ["What do we call an extreme exaggeration for effect?", "Hyperbole"],
      ["What is a word that imitates a sound, like “buzz”?", "Onomatopoeia"],
      ["What is repeating the same beginning consonant sound called?", "Alliteration"],
      ["Which pronouns does first-person point of view use?", "I, me, we"],
      ["What is a story's central message or lesson called?", "The theme"],
      ["What do we call a word that takes the place of a noun?", "A pronoun"],
      ["What is a three-line poem with 5-7-5 syllables?", "A haiku"],
      ["What is a comparison without “like” or “as” called?", "A metaphor"],
      ["What do we call hints about what will happen later in a story?", "Foreshadowing"],
    ],
    "9-12": [
      ["Who wrote “Romeo and Juliet”?", "William Shakespeare"],
      ["What is a 14-line poem called?", "A sonnet"],
      ["What irony occurs when the audience knows something a character doesn't?", "Dramatic irony"],
      ["Who wrote “To Kill a Mockingbird”?", "Harper Lee"],
      ["What is a brief reference to a well-known person, place, or work?", "An allusion"],
      ["Which persuasive appeal uses emotion?", "Pathos"],
      ["Which persuasive appeal uses logic and evidence?", "Logos"],
      ["Which persuasive appeal relies on credibility?", "Ethos"],
      ["Who wrote the novel “1984”?", "George Orwell"],
      ["What is unrhymed iambic pentameter called?", "Blank verse"],
      ["What is a speech in which a character speaks their thoughts alone on stage?", "A soliloquy"],
      ["What do we call a story's main character?", "The protagonist"],
    ],
  },
};

/** All static questions with stable ids, e.g. "science:3-5:4". */
export function staticQuestions(subject: "science" | "social" | "ela", grade: GradeBand): QuizQuestion[] {
  return BANK[subject][grade].map(([q, a], i) => ({ id: `${subject}:${grade}:${i}`, q, a, subject }));
}

const r = (lo: number, hi: number, rand: (n: number) => number) => lo + rand(hi - lo + 1);

/** A fresh, grade-appropriate math question. Answers are computed, never typed by hand. */
export function mathQuestion(grade: GradeBand, rand: (n: number) => number = randomInt): QuizQuestion {
  const kind = rand(4);
  let q = "";
  let a = "";
  if (grade === "K-2") {
    if (kind === 0) { const x = r(0, 10, rand), y = r(0, 10, rand); q = `What is ${x} + ${y}?`; a = String(x + y); }
    else if (kind === 1) { const x = r(5, 20, rand), y = r(0, x, rand); q = `What is ${x} − ${y}?`; a = String(x - y); }
    else if (kind === 2) { const x = r(10, 98, rand); q = `What number comes right after ${x}?`; a = String(x + 1); }
    else { const t = r(1, 9, rand), o = r(0, 9, rand); q = `How many tens are in ${t * 10 + o}?`; a = String(t); }
  } else if (grade === "3-5") {
    if (kind === 0) { const x = r(2, 12, rand), y = r(2, 12, rand); q = `What is ${x} × ${y}?`; a = String(x * y); }
    else if (kind === 1) { const d = r(2, 12, rand), qq = r(2, 12, rand); q = `What is ${d * qq} ÷ ${d}?`; a = String(qq); }
    else if (kind === 2) { const x = r(101, 989, rand); q = `Round ${x} to the nearest hundred.`; a = String(Math.round(x / 100) * 100); }
    else { const den = [2, 4, 5, 10][rand(4)], m = r(1, 10, rand); q = `What is 1/${den} of ${den * m}?`; a = String(m); }
  } else if (grade === "6-8") {
    if (kind === 0) { const p = [10, 20, 25, 50, 75][rand(5)], base = r(1, 20, rand) * 4 * 5; q = `What is ${p}% of ${base}?`; a = String((p * base) / 100); }
    else if (kind === 1) { const x = r(-12, 12, rand), y = r(-12, 12, rand); q = `What is ${x} + (${y})?`; a = String(x + y); }
    else if (kind === 2) { const n = r(2, 15, rand); q = `What is ${n}²?`; a = String(n * n); }
    else { const x = r(1, 9, rand), y = r(1, 9, rand), z = r(1, 9, rand); q = `What is ${x} + ${y} × ${z}?`; a = String(x + y * z); }
  } else {
    if (kind === 0) { const m = r(2, 9, rand), x = r(-10, 10, rand), b = r(-20, 20, rand); q = `Solve for x: ${m}x ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${m * x + b}`; a = `x = ${x}`; }
    else if (kind === 1) { const n = r(2, 20, rand); q = `What is √${n * n}?`; a = String(n); }
    else if (kind === 2) { const x1 = r(-5, 5, rand), y1 = r(-5, 5, rand), m = r(-4, 4, rand), dx = r(1, 5, rand); q = `What is the slope of the line through (${x1}, ${y1}) and (${x1 + dx}, ${y1 + m * dx})?`; a = String(m); }
    else { const b = r(2, 5, rand), e = r(2, 4, rand); q = `What is ${b} to the power of ${e}?`; a = String(b ** e); }
  }
  return { id: `math:${grade}:${q}`, q, a, subject: "math" };
}

export interface QuizDraw {
  question: QuizQuestion | null; // null = round complete
  used: string[];
}

/**
 * Draw the next question. Static and custom questions never repeat within a round (`used`);
 * math is generated fresh. Mixed rotates subjects at random.
 */
export function drawQuestion(
  grade: GradeBand,
  subject: QuizSubject,
  used: string[],
  custom: { id: string; q: string; a: string }[] = [],
  rand: (n: number) => number = randomInt,
): QuizDraw {
  if (subject === "math") return { question: mathQuestion(grade, rand), used };
  if (subject === "custom") {
    const pool = custom.filter((c) => c.q.trim() && !used.includes(c.id));
    if (!pool.length) return { question: null, used };
    const c = pool[rand(pool.length)];
    return { question: { id: c.id, q: c.q, a: c.a, subject: "custom" }, used: [...used, c.id] };
  }
  const subjects = subject === "mixed" ? (["science", "social", "ela"] as const) : ([subject] as const);
  const pool = subjects.flatMap((s) => staticQuestions(s, grade)).filter((x) => !used.includes(x.id));
  if (!pool.length) return { question: null, used }; // round complete
  // In mixed mode, about one question in four is generated math.
  if (subject === "mixed" && rand(4) === 0) return { question: mathQuestion(grade, rand), used };
  const pick = shuffle(pool)[0];
  return { question: pick, used: [...used, pick.id] };
}
