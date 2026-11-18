/**
 * Content schema. `words.json` is hand-seeded today; the Python pipeline
 * (see ../../../README.md) is meant to emit this same shape later.
 */

export type LangCode = 'en' | 'es' | 'fr' | 'de' | 'it';

export type RelationKind =
  | 'cognate' // shares an ancestor word
  | 'borrowing' // one language took the word from the other
  | 'calque' // loan-translation, piece by piece
  | 'root' // built from the same root
  | 'false-friend' // looks alike, means something different
  | 'opposite'
  | 'related';

export type Relation = {
  /** Set when the related word is itself an entry in words.json. */
  id?: string;
  term: string;
  /** Any ISO-639-1-ish code; may be outside LangCode (e.g. 'la', 'ar'). */
  lang: string;
  kind: RelationKind;
  note?: string;
};

export type Word = {
  id: string;
  lang: LangCode;
  term: string;
  ipa: string;
  pos: string;
  /** Short English meaning shown on the flashcard back. */
  gloss: string;
  definition: string;
  example: string;
  /** English translation of `example` for non-English words. */
  exampleTranslation?: string;
  etymology: string;
  fact?: string;
  related: Relation[];
  /** 1 = common, 3 = advanced. Controls the order new cards are introduced. */
  level: 1 | 2 | 3;
};
