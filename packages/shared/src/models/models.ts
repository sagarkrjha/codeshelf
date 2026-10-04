export interface SnippetComplexity {
  time?: string;
  space?: string;
}

export interface SnippetRevision {
  version: number;
  code: string;
  description?: string;
  markdown?: string;
  changeSummary?: string;
  timestamp: string;
  snapshot?: Partial<Snippet>;
  hash?: string;
}

export interface SnippetCodeBlock {
  code: string;
  language: string;
  name?: string;
}

export interface Snippet {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  category?: string;
  folder?: string;
  subcategory?: string;
  tags: string[];
  technology?: string[];
  usage?: string[];
  complexity?: SnippetComplexity;
  version?: number;
  history?: SnippetRevision[];
  markdown?: string;
  codeBlocks?: SnippetCodeBlock[];
  hash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnippetInput {
  title: string;
  code: string;
  language: string;
  description?: string;
  category?: string;
  folder?: string;
  subcategory?: string;
  tags?: string[];
  technology?: string[];
  usage?: string[];
  complexity?: SnippetComplexity;
  markdown?: string;
  codeBlocks?: SnippetCodeBlock[];
}

export interface UpdateSnippetInput {
  title?: string;
  code?: string;
  language?: string;
  description?: string;
  category?: string;
  folder?: string;
  subcategory?: string;
  tags?: string[];
  technology?: string[];
  usage?: string[];
  complexity?: SnippetComplexity;
  markdown?: string;
  codeBlocks?: SnippetCodeBlock[];
  changeSummary?: string;
}

export interface SnippetFilter {
  query?: string;
  technology?: string | string[];
  domain?: string | string[];
  folder?: string | string[];
  subcategory?: string | string[];
  usage?: string | string[];
  language?: string | string[];
  tag?: string | string[];
  complexityTime?: string;
  complexitySpace?: string;
}

export type SnippetSortOption = 'updated_desc' | 'created_desc' | 'title_asc';
