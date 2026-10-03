import { executeSafeAiCall, DEFAULT_GEMINI_MODEL } from "./client";
import { normalizeTechnologies } from "../taxonomy/canonical";

export interface AiAutofillParams {
  code: string;
  language?: string;
  apiKey: string;
  model?: string;
}

export interface AiAutofillComplexity {
  time?: string;
  space?: string;
}

export interface AiAutofillExplanation {
  headings: string[];
  content: Record<string, string>;
}

export interface AiAutofillResult {
  title: string;
  description: string;
  explanation?: AiAutofillExplanation;
  category: string;
  subcategory?: string;
  tags: string[];
  technology: string[];
  usage: string[];
  complexity?: AiAutofillComplexity;
}

interface CodeBlock {
  language?: string;
  code: string;
}

const CODE_BLOCK_REGEX =
  /```([a-zA-Z0-9_+#.-]*)[ \t]*\r?\n([\s\S]*?)```/g;

/**
 * Gemini prompt for generating metadata from source code.
 *
 * Important:
 * - Code is always the source of truth.
 * - Previous metadata must never override the current code.
 * - Explanations must adapt to the detected domain.
 * - Usage must contain metadata tags, never sentences.
 */
const AGNOSTIC_AUTOFILL_PROMPT = `
You are a senior software engineer, code reviewer, technical writer, and metadata
classifier.

Analyze the provided source code and return ONLY valid JSON.

The code may belong to ANY software engineering domain, including:

- Competitive Programming
- Algorithms
- Data Structures
- Frontend
- Backend
- Full Stack
- Web Development
- Mobile / App Development
- Database
- System Programming
- Operating Systems
- Networking
- Cybersecurity
- DevOps
- Cloud
- AI / Machine Learning
- Data Engineering
- Game Development
- Automation
- Scripting
- Language Features
- Design Patterns
- System Design
- Utilities
- Testing
- Build Tooling
- Developer Tooling
- Other software domains

The CURRENT CODE IS THE SOURCE OF TRUTH.

If this is an edit of an existing snippet:

- Analyze the current code again.
- Do not blindly preserve previous metadata.
- Previous metadata may be stale or incorrect.
- If the code changed, regenerate affected metadata.
- Never let old metadata override what the current code actually does.

==================================================
OUTPUT SCHEMA
==================================================

Return exactly:

{
  "title": "string",
  "description": "string",
  "explanation": {
    "headings": [
      "heading1",
      "heading2",
      "heading3",
      "heading4"
    ],
    "content": {
      "heading1": "string",
      "heading2": "string",
      "heading3": "string",
      "heading4": "string"
    }
  },
  "category": "string",
  "subcategory": "string",
  "tags": ["string"],
  "technology": ["string"],
  "usage": ["string"],
  "complexity": {
    "time": "string",
    "space": "string"
  }
}

Rules:

- Do not return markdown.
- Do not return code fences.
- Do not return comments outside JSON.
- Do not add fields outside the schema.
- "subcategory" may be omitted when it is genuinely unclear.
- "complexity" may be omitted when asymptotic complexity cannot be meaningfully derived.

==================================================
TITLE
==================================================

Create a concise and technically accurate title.

Good:

"Binary Search"
"Sentinel Linear Search"
"JWT Authentication Middleware"
"React Debounce Hook"
"LRU Cache"
"Trie Prefix Search"
"PostgreSQL Connection Pool"
"Go HTTP Middleware"

Avoid:

"Interesting Code"
"Useful Function"
"Code Example"
"Advanced Implementation"

Do not mention the programming language in the title unless it is useful.

==================================================
DESCRIPTION
==================================================

Write a medium-short description of approximately 15-35 words.

The description must explain:

1. What the code actually does.
2. The important technique or behavior.
3. A meaningful constraint or characteristic when relevant.

Do not write marketing language.

Do not exaggerate performance.

Bad:

"An extremely fast implementation that dramatically improves performance."

Good:

"Searches an unsorted array using a temporary sentinel to remove the loop boundary check while preserving linear-time search behavior."

==================================================
DOMAIN DETECTION
==================================================

First determine what kind of code this is internally.

Possible domains include:

- competitive programming
- algorithms
- data structures
- frontend
- backend
- full-stack
- web
- mobile
- database
- system-programming
- networking
- security
- devops
- cloud
- ai-ml
- data-engineering
- game-development
- automation
- language-feature
- design-pattern
- system-design
- testing
- tooling
- utilities
- other

Do NOT expose a separate "domain" field.

Use the detected domain to determine the explanation headings.

==================================================
DYNAMIC EXPLANATION
==================================================

The explanation MUST contain EXACTLY FOUR headings.

The headings MUST:

- be meaningful for the detected domain
- describe the actual code
- be unique
- use camelCase
- contain no spaces
- contain no markdown
- not always be "what", "why", "when", "how"
- not use generic headings when domain-specific headings are more meaningful

Each heading must have a corresponding property in "content".

Each explanation content should normally be 1-3 concise sentences.

Do not invent behavior that is not present in the code.

Examples:

--------------------------------
Competitive Programming
--------------------------------

Possible headings:

"problem"
"keyObservation"
"approach"
"optimization"

--------------------------------
Algorithms
--------------------------------

Possible headings:

"algorithmGoal"
"coreIdea"
"whenToUse"
"executionFlow"

--------------------------------
Data Structures
--------------------------------

Possible headings:

"dataStructureRole"
"coreInvariant"
"operationStrategy"
"tradeoffs"

--------------------------------
Frontend
--------------------------------

Possible headings:

"uiResponsibility"
"stateFlow"
"renderingStrategy"
"lifecycle"

--------------------------------
React
--------------------------------

Possible headings:

"componentRole"
"stateFlow"
"renderingBehavior"
"lifecycle"

--------------------------------
Backend
--------------------------------

Possible headings:

"serviceResponsibility"
"requestFlow"
"dataHandling"
"operationalConcerns"

--------------------------------
Database
--------------------------------

Possible headings:

"databaseOperation"
"queryStrategy"
"dataAccessPattern"
"tradeoffs"

--------------------------------
Mobile / App Development
--------------------------------

Possible headings:

"featureRole"
"platformIntegration"
"lifecycle"
"resourceHandling"

--------------------------------
System Programming
--------------------------------

Possible headings:

"systemRole"
"resourceHandling"
"executionModel"
"tradeoffs"

--------------------------------
Networking
--------------------------------

Possible headings:

"networkRole"
"protocolBehavior"
"dataFlow"
"failureHandling"

--------------------------------
Security
--------------------------------

Possible headings:

"protectionGoal"
"securityMechanism"
"threatContext"
"enforcement"

Do NOT claim that code provides security guarantees that cannot be established from the code.

--------------------------------
DevOps / Cloud
--------------------------------

Possible headings:

"operationalPurpose"
"infrastructureRole"
"deploymentFlow"
"operationalTradeoffs"

--------------------------------
AI / Machine Learning
--------------------------------

Possible headings:

"task"
"modelStrategy"
"dataFlow"
"inferenceBehavior"

--------------------------------
Design Patterns
--------------------------------

Possible headings:

"patternRole"
"designProblem"
"collaboration"
"tradeoffs"

--------------------------------
Language Features
--------------------------------

Possible headings:

"languageCapability"
"designReason"
"usageContext"
"executionBehavior"

--------------------------------
Testing
--------------------------------

Possible headings:

"testingGoal"
"behaviorCovered"
"testStrategy"
"failureDetection"

--------------------------------
Tooling / Utilities
--------------------------------

Possible headings:

"toolPurpose"
"processingFlow"
"inputOutput"
"operationalConsiderations"

Choose headings based on the actual code.

Do NOT force the examples above if they do not fit.

==================================================
EXPLANATION ACCURACY
==================================================

Separate guaranteed behavior from possible optimization.

Never make exaggerated performance claims.

For example, do NOT say:

"Removing one comparison cuts runtime in half."

Instead say:

"The sentinel guarantees that the scan encounters the target before reaching the array boundary, removing the explicit boundary check from each loop iteration."

Do not claim:

- CPU instruction-pipeline improvements
- compiler optimizations
- JIT optimizations
- cache behavior improvements
- hardware-level benefits

unless they are directly justified by the code and the claim is genuinely appropriate.

Do not confuse:

- fewer operations
- fewer comparisons
- lower constant factors
- better asymptotic complexity

A constant-factor optimization must NOT be described as an asymptotic improvement.

==================================================
SIDE EFFECTS AND TRADEOFFS
==================================================

Identify meaningful side effects and tradeoffs when present.

Consider:

- input mutation
- global state mutation
- shared state
- filesystem writes
- database writes
- network requests
- DOM mutation
- cache mutation
- resource acquisition
- resource cleanup
- temporary mutation followed by restoration
- concurrency concerns
- recursion depth
- memory overhead
- ordering requirements
- stability requirements
- preprocessing requirements
- external dependencies

If the code temporarily modifies an input and restores it later, mention that when materially relevant.

Do not call code "side-effect free" if it temporarily mutates state.

==================================================
CATEGORY
==================================================

Choose one broad category.

Examples:

"Algorithms"
"Data Structures"
"Frontend"
"Backend"
"Database"
"System Programming"
"Networking"
"Security"
"DevOps"
"Cloud"
"AI/ML"
"Mobile"
"Game Development"
"Testing"
"Developer Tools"
"Utilities"

Use the most specific reasonable category.

==================================================
SUBCATEGORY
==================================================

Choose a useful narrower classification.

Examples:

Algorithms:
- Searching
- Sorting
- Graph
- Dynamic Programming
- Greedy
- String Algorithms

Data Structures:
- Tree
- Graph
- Hash Table
- Heap
- Linked List
- Stack
- Queue

Frontend:
- React
- State Management
- DOM
- Forms
- Animation
- Performance

Backend:
- API
- Authentication
- Middleware
- Database Access
- Caching
- Validation

Do not invent a subcategory when it is unclear.

==================================================
TAGS
==================================================

Return 3-6 concise searchable technical tags.

Tags MUST:

- be lowercase
- use hyphens instead of spaces
- be technically meaningful
- describe concepts actually present in the code

Good:

[
  "linear-search",
  "sentinel-search",
  "array",
  "search-optimization"
]

Bad:

[
  "fast",
  "useful",
  "advanced",
  "best-code"
]

Do not use marketing words.

==================================================
TECHNOLOGY
==================================================

Return the actual programming languages, frameworks, libraries, platforms,
or technologies explicitly evidenced by the code.

Do NOT automatically add related technologies.

Examples:

TypeScript code:

["TypeScript"]

JavaScript code:

["JavaScript"]

React + TypeScript:

["TypeScript", "React"]

Node.js + TypeScript + Express:

["TypeScript", "Node.js", "Express"]

C++:

["C++"]

Do not return:

["TypeScript", "JavaScript"]

just because TypeScript ultimately executes in a JavaScript environment.

Only include JavaScript separately if JavaScript-specific code or tooling is
actually relevant.

For multiple code blocks, include all technologies that are actually used.

==================================================
USAGE
==================================================

"usage" is metadata, NOT a description.

Return 2-4 short lowercase searchable tags.

Prefer ONE WORD per item.

Examples:

[
  "search",
  "optimization",
  "algorithms",
  "arrays"
]

For concepts that genuinely require multiple words, use a hyphen:

[
  "api-client",
  "state-management",
  "competitive-programming"
]

NEVER return sentences.

BAD:

[
  "Searching through unsorted arrays where performance is important."
]

GOOD:

[
  "search",
  "optimization",
  "unsorted-array",
  "algorithms"
]

==================================================
COMPLEXITY
==================================================

If meaningful asymptotic complexity can be derived, provide it.

For algorithms:

- time should normally represent worst-case complexity
- space should represent auxiliary space
- mention best-case only when materially useful
- do not confuse input storage with auxiliary space

Examples:

{
  "time": "O(n)",
  "space": "O(1)"
}

If useful:

{
  "time": "Best O(1), Worst O(n)",
  "space": "O(1)"
}

Do not invent Big-O complexity for:

- UI rendering
- external API latency
- network operations
- database systems

unless the complexity is genuinely determined by the local algorithm.

Do not claim an asymptotic improvement when the code only removes a constant
number of operations.

==================================================
MULTIPLE CODE BLOCKS
==================================================

The input may contain multiple fenced code blocks.

Analyze them as one logical snippet when they collectively represent one feature,
implementation, example, or workflow.

Consider:

- relationships between blocks
- imports/exports
- shared types
- framework usage
- language differences
- implementation dependencies

Do not analyze each block independently if they clearly form one logical feature.

==================================================
MISSING OR AMBIGUOUS INFORMATION
==================================================

Never invent:

- libraries
- frameworks
- APIs
- security guarantees
- performance guarantees
- runtime behavior
- database behavior
- external services

When something cannot be established from the code, describe only what can
reasonably be inferred.

==================================================
FINAL QUALITY CHECK
==================================================

Before returning JSON, verify:

1. Title describes the actual implementation.
2. Description is 15-35 meaningful words.
3. Exactly four explanation headings exist.
4. Every explanation heading has matching content.
5. Explanation headings are domain-specific.
6. Explanation content is technically accurate.
7. No exaggerated performance claims exist.
8. Side effects and important tradeoffs are captured.
9. Category is appropriate.
10. Subcategory is appropriate when known.
11. Tags are lowercase searchable technical tags.
12. Technology contains only evidenced technologies.
13. Usage contains 2-4 metadata tags, NOT sentences.
14. Complexity is mathematically reasonable.
15. No unsupported assumptions were introduced.
16. Output is valid JSON.
17. No markdown surrounds the JSON.
`;

/**
 * Normalize language aliases to canonical names.
 */
function normalizeLanguage(language?: string): string | undefined {
  if (!language) return undefined;

  const normalized = language.trim().toLowerCase();

  const aliases: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    jsx: "JavaScript",

    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TypeScript",

    c: "C",
    cpp: "C++",
    "c++": "C++",
    cc: "C++",
    cxx: "C++",

    py: "Python",
    python: "Python",

    go: "Go",
    golang: "Go",

    java: "Java",

    cs: "C#",
    csharp: "C#",

    rs: "Rust",
    rust: "Rust",

    kt: "Kotlin",
    kotlin: "Kotlin",

    swift: "Swift",

    php: "PHP",

    rb: "Ruby",
    ruby: "Ruby",

    sh: "Shell",
    bash: "Shell",
    shell: "Shell",

    sql: "SQL",

    html: "HTML",
    css: "CSS",

    json: "JSON",

    yaml: "YAML",
    yml: "YAML",

    md: "Markdown",
    markdown: "Markdown",
  };

  return aliases[normalized] ?? language.trim();
}

/**
 * Extract fenced code blocks.
 *
 * If no fenced block exists, the entire input is treated as one code block.
 */
export function extractCodeBlocks(code: string, fallbackLanguage?: string): CodeBlock[] {
  const source = code.trim();

  if (!source) {
    return [];
  }

  const blocks: CodeBlock[] = [];

  CODE_BLOCK_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = CODE_BLOCK_REGEX.exec(source)) !== null) {
    const language = normalizeLanguage(match[1]);
    const blockCode = match[2]?.trim();

    if (!blockCode) {
      continue;
    }

    blocks.push({
      language,
      code: blockCode,
    });
  }

  if (blocks.length > 0) {
    return blocks;
  }

  return [
    {
      language: normalizeLanguage(fallbackLanguage),
      code: source,
    },
  ];
}

/**
 * Prepare source code for the AI.
 *
 * Multiple blocks are preserved and clearly separated.
 */
export function prepareCodeInput(
  code: string,
  fallbackLanguage?: string
): string {
  const blocks = extractCodeBlocks(code, fallbackLanguage);

  if (blocks.length === 0) {
    throw new Error("No source code was provided.");
  }

  return blocks
    .map((block, index) => {
      const language = block.language
        ? ` language="${block.language}"`
        : "";

      return [
        `===== CODE BLOCK ${index + 1}${language} =====`,
        block.code,
        `===== END CODE BLOCK ${index + 1} =====`,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Remove common markdown wrappers accidentally returned by the model.
 */
export function cleanJsonResponse(value: string): string {
  let cleaned = value.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

function normalizeString(
  value: unknown,
  fallback = ""
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim() || fallback;
}

function normalizeStringArray(
  value: unknown,
  maxItems = 10
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

/**
 * Normalize technical tags.
 *
 * Example:
 * "Linear Search" -> "linear-search"
 * "ARRAY_SEARCH" -> "array-search"
 */
function normalizeMetadataTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9+#.-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTags(value: unknown): string[] {
  const raw = normalizeStringArray(value, 8);

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const normalized = normalizeMetadataTag(item);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);

    if (result.length >= 6) {
      break;
    }
  }

  return result;
}

function toCamelCase(str: string): string {
  const cleaned = str.trim().replace(/[^a-zA-Z0-9\s_-]/g, "");
  if (!cleaned) return "";
  const camel = cleaned
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
  return camel;
}

/**
 * Usage is deliberately stricter than normal tags.
 *
 * Usage should represent searchable metadata tags such as:
 *
 * ["search", "optimization", "arrays", "algorithms"]
 *
 * and never sentences:
 *
 * ["Used when searching through arrays..."]
 */
export function normalizeUsage(value: unknown): string[] {
  const raw = normalizeStringArray(value, 6);

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const trimmed = item.trim();
    // Reject sentence-like strings: punctuation, long strings, or many words
    if (/[.!?]/.test(trimmed)) {
      continue;
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 3) {
      continue;
    }

    const normalized = normalizeMetadataTag(trimmed);

    if (!normalized) {
      continue;
    }

    const hyphenParts = normalized.split("-").filter(Boolean);
    if (normalized.length > 30 || hyphenParts.length > 3) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);

    if (result.length >= 4) {
      break;
    }
  }

  return result;
}

/**
 * Validate modern dynamic explanation.
 */
export function normalizeExplanation(
  value: unknown
): AiAutofillExplanation | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const explanation = value as {
    headings?: unknown;
    content?: unknown;
  };

  if (!Array.isArray(explanation.headings)) {
    return undefined;
  }

  if (
    !explanation.content ||
    typeof explanation.content !== "object" ||
    Array.isArray(explanation.content)
  ) {
    return undefined;
  }

  const rawHeadings = normalizeStringArray(explanation.headings, 8);
  const headings: string[] = [];
  const seenHeadings = new Set<string>();

  for (const h of rawHeadings) {
    const camel = toCamelCase(h);
    if (!camel) continue;
    const lower = camel.toLowerCase();
    if (!seenHeadings.has(lower)) {
      seenHeadings.add(lower);
      headings.push(camel);
      if (headings.length === 4) break;
    }
  }

  if (headings.length !== 4) {
    return undefined;
  }

  const rawContent = explanation.content as Record<string, unknown>;
  const contentMap = new Map<string, string>();
  for (const [k, v] of Object.entries(rawContent)) {
    const normalizedKey = toCamelCase(k).toLowerCase();
    const strVal = normalizeString(v);
    if (normalizedKey && strVal) {
      contentMap.set(normalizedKey, strVal);
    }
  }

  const content: Record<string, string> = {};

  for (const heading of headings) {
    const directMatch = normalizeString(rawContent[heading]);
    const matched = directMatch || contentMap.get(heading.toLowerCase());

    if (!matched) {
      return undefined;
    }

    content[heading] = matched;
  }

  return {
    headings,
    content,
  };
}

/**
 * Support metadata generated by older versions of the prompt.
 *
 * Old format:
 *
 * {
 *   "what": "...",
 *   "why": "...",
 *   "when": "...",
 *   "how": "..."
 * }
 */
export function migrateLegacyExplanation(
  value: unknown
): AiAutofillExplanation | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const legacy = value as Record<string, unknown>;

  const what = normalizeString(legacy.what);
  const why = normalizeString(legacy.why);
  const when = normalizeString(legacy.when);
  const how = normalizeString(legacy.how);

  if (!what || !why || !when || !how) {
    return undefined;
  }

  return {
    headings: [
      "purpose",
      "rationale",
      "useCases",
      "implementation",
    ],
    content: {
      purpose: what,
      rationale: why,
      useCases: when,
      implementation: how,
    },
  };
}

export function normalizeComplexity(
  value: unknown
): AiAutofillComplexity | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const complexity = value as Record<string, unknown>;

  const time = normalizeString(complexity.time);
  const space = normalizeString(complexity.space);

  if (!time && !space) {
    return undefined;
  }

  return {
    ...(time ? { time } : {}),
    ...(space ? { space } : {}),
  };
}

/**
 * Normalize the complete AI response.
 */
export function normalizeAutofillResult(
  value: unknown
): AiAutofillResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI returned an invalid metadata object.");
  }

  const data = value as Record<string, unknown>;

  const title = normalizeString(
    data.title,
    "Code Snippet"
  );

  const rawDescription = normalizeString(
    data.description,
    "A reusable code implementation."
  );
  // Ensure description is clean and reasonably bounded (15-35 words ideal)
  const description = rawDescription;

  const category = normalizeString(
    data.category,
    "Utilities"
  );

  const subcategory = normalizeString(data.subcategory);

  const tags = normalizeTags(data.tags);

  const rawTech = Array.isArray(data.technology)
    ? data.technology.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean)
    : [];
  // Use canonical technology normalization: canonicalizes each and eliminates duplicates
  const technology = normalizeTechnologies(rawTech).slice(0, 8);

  const usage = normalizeUsage(data.usage);

  const explanation =
    normalizeExplanation(data.explanation) ??
    migrateLegacyExplanation(data.explanation);

  const complexity = normalizeComplexity(
    data.complexity
  );

  return {
    title,
    description,
    ...(explanation ? { explanation } : {}),
    category,
    ...(subcategory ? { subcategory } : {}),
    tags,
    technology,
    usage,
    ...(complexity ? { complexity } : {}),
  };
}

/**
 * Parse Gemini's JSON response safely.
 */
export function parseAutofillResponse(
  responseText: string
): AiAutofillResult {
  const cleaned = cleanJsonResponse(responseText);

  if (!cleaned) {
    throw new Error("AI returned an empty response.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "AI returned invalid JSON metadata."
    );
  }

  return normalizeAutofillResult(parsed);
}

/**
 * Generate metadata from source code.
 *
 * Supports:
 * - raw source code
 * - one fenced code block
 * - multiple fenced code blocks
 * - language aliases
 * - edit/regeneration workflows
 */
export async function aiAutofillFromCode(
  params: AiAutofillParams
): Promise<AiAutofillResult> {
  const {
    code,
    language,
    apiKey,
    model = DEFAULT_GEMINI_MODEL,
  } = params;

  if (!apiKey?.trim()) {
    throw new Error("Gemini API key is required.");
  }

  if (!code?.trim()) {
    throw new Error("Code snippet cannot be empty for AI autofill.");
  }

  const preparedCode = prepareCodeInput(
    code,
    language
  );

  const userPrompt = `
Analyze the following source code.

The optional language provided by the caller is:
${normalizeLanguage(language) ?? "unknown"}

Treat the code itself as authoritative.

Generate metadata according to the system instructions.

Remember:

- Detect the actual domain from the code.
- Use exactly four meaningful domain-specific explanation headings.
- Do not use generic what/why/when/how headings unless those concepts are genuinely the most appropriate headings.
- Keep explanation content concise and technically accurate.
- Usage MUST contain short lowercase metadata tags, never sentences.
- Do not exaggerate performance.
- Identify important side effects and tradeoffs.
- Technology must contain only technologies actually evidenced by the code.
- Complexity must be mathematically defensible.
- Do not invent external libraries, frameworks, APIs, or behavior.

SOURCE CODE:

${preparedCode}
`;

  const response = await executeSafeAiCall(
    apiKey,
    async (ai) => {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: AGNOSTIC_AUTOFILL_PROMPT,
              },
              {
                text: userPrompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      return response;
    }
  );

  const responseText =
    typeof response?.text === "string"
      ? response.text
      : "";

  if (!responseText.trim()) {
    throw new Error(
      "Gemini returned an empty metadata response."
    );
  }

  return parseAutofillResponse(responseText);
}
