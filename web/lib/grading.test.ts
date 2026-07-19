import { describe, expect, it } from "vitest";
import { canonicalNumber, isAnswerCorrect, levenshtein, normalizeAnswer } from "./grading";

describe("normalizeAnswer", () => {
  it("lowercases and trims", () => {
    expect(normalizeAnswer("  Paris  ")).toBe("paris");
  });
  it("strips punctuation", () => {
    expect(normalizeAnswer("O'Brien!")).toBe("o brien");
    expect(normalizeAnswer("Rock & Roll")).toBe("rock roll");
  });
  it("collapses internal whitespace", () => {
    expect(normalizeAnswer("New    York")).toBe("new york");
  });
  it("drops one leading article", () => {
    expect(normalizeAnswer("The Beatles")).toBe("beatles");
    expect(normalizeAnswer("An Apple")).toBe("apple");
    expect(normalizeAnswer("a dog")).toBe("dog");
  });
  it("only drops the first article, not internal ones", () => {
    expect(normalizeAnswer("The Cat and the Hat")).toBe("cat and the hat");
  });
  it("strips accents", () => {
    expect(normalizeAnswer("Café")).toBe("cafe");
    expect(normalizeAnswer("Beyoncé")).toBe("beyonce");
  });
});

describe("levenshtein", () => {
  it("is zero for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("counts single edits", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("paris", "pariss")).toBe(1);
  });
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("isAnswerCorrect", () => {
  it("accepts an exact match", () => {
    expect(isAnswerCorrect("Paris", "Paris")).toBe(true);
  });
  it("accepts a match after normalization (case/article/punctuation)", () => {
    expect(isAnswerCorrect("the beatles", "Beatles")).toBe(true);
    expect(isAnswerCorrect("FRANCE.", "France")).toBe(true);
  });
  it("tolerates a minor typo", () => {
    expect(isAnswerCorrect("Napolean", "Napoleon")).toBe(true); // 1 transposition-ish edit
    expect(isAnswerCorrect("Missisippi", "Mississippi")).toBe(true);
  });
  it("tolerates typos proportional to length on long answers", () => {
    // "Franklin Roosevelt" normalized length ~18 → tolerance floor(0.2*18)=3
    expect(isAnswerCorrect("Franklin Rosevelt", "Franklin Roosevelt")).toBe(true);
  });
  it("rejects a clearly wrong answer", () => {
    expect(isAnswerCorrect("London", "Paris")).toBe(false);
    expect(isAnswerCorrect("Einstein", "Newton")).toBe(false);
  });
  it("rejects an empty submission", () => {
    expect(isAnswerCorrect("", "Paris")).toBe(false);
    expect(isAnswerCorrect("   ", "Paris")).toBe(false);
  });
  it("treats any capitalization as a match", () => {
    expect(isAnswerCorrect("paris", "Paris")).toBe(true);
    expect(isAnswerCorrect("PARIS", "Paris")).toBe(true);
    expect(isAnswerCorrect("nEW yORK", "New York")).toBe(true);
  });
  it("treats close spelling as a match", () => {
    expect(isAnswerCorrect("Pariss", "Paris")).toBe(true); // extra letter
    expect(isAnswerCorrect("Napolean", "Napoleon")).toBe(true); // transposition
    expect(isAnswerCorrect("Massachussets", "Massachusetts")).toBe(true); // long-word typos
  });
});

describe("canonicalNumber", () => {
  it("canonicalizes numeric answers, ignoring separators and symbols", () => {
    expect(canonicalNumber("1,000")).toBe("1000");
    expect(canonicalNumber("$500")).toBe("500");
    expect(canonicalNumber("50%")).toBe("50");
    expect(canonicalNumber("2015.")).toBe("2015");
    expect(canonicalNumber(" 007 ")).toBe("7");
    expect(canonicalNumber("3.14")).toBe("3.14");
    expect(canonicalNumber("-5")).toBe("-5");
  });
  it("returns null for non-numeric answers", () => {
    expect(canonicalNumber("Paris")).toBeNull();
    expect(canonicalNumber("Apollo 11")).toBeNull();
    expect(canonicalNumber("")).toBeNull();
  });
});

describe("isAnswerCorrect — numeric answers are exact", () => {
  it("rejects a near-miss number (the whole point)", () => {
    expect(isAnswerCorrect("2", "1")).toBe(false);
    expect(isAnswerCorrect("41", "40")).toBe(false);
    expect(isAnswerCorrect("2016", "2015")).toBe(false);
    expect(isAnswerCorrect("501", "500")).toBe(false);
  });
  it("accepts the exact number", () => {
    expect(isAnswerCorrect("1", "1")).toBe(true);
    expect(isAnswerCorrect("40", "40")).toBe(true);
  });
  it("still ignores formatting noise on numbers", () => {
    expect(isAnswerCorrect("1000", "1,000")).toBe(true);
    expect(isAnswerCorrect("$500", "500")).toBe(true);
    expect(isAnswerCorrect(" 40 ", "40")).toBe(true);
  });
  it("rejects a non-numeric guess at a numeric answer", () => {
    expect(isAnswerCorrect("forty", "40")).toBe(false);
    expect(isAnswerCorrect("", "40")).toBe(false);
  });
  it("leaves text answers on the fuzzy path", () => {
    expect(isAnswerCorrect("Pariss", "Paris")).toBe(true);
    // tolerance is 2 for short text answers; "cat" vs "dog" is distance 3
    expect(isAnswerCorrect("cat", "dog")).toBe(false);
  });
  it("keeps fuzz on answers that merely contain digits", () => {
    // Not purely numeric, so the text path still applies.
    expect(isAnswerCorrect("Apollo 11", "Apollo 11")).toBe(true);
  });
});
