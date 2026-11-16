// The shape of one law article after parsing, independent of the source HTML.

/** A lettered list item inside a paragraph, e.g. "a. on account of ..." */
export interface ListItem {
  label: string; // "a."
  text: string;
}

/** One numbered paragraph ("Absatz") of an article. */
export interface Paragraph {
  number: string | null; // "1", "2", ... or null if the article has a single unnumbered paragraph
  text: string;
  items: ListItem[];
}

export interface Article {
  number: string; // "Art. 335c"
  headingPath: string[]; // ["Section One: ...", "F. Termination", "II. Notice periods"]
  paragraphs: Paragraph[];
}
