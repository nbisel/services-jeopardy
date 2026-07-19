import { describe, expect, it } from "vitest";
import { isAnswerCorrect, levenshtein, normalizeAnswer } from "./grading";

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
  it("does not let the short-answer floor over-match distinct short words", () => {
    // tolerance is 2 for short answers; "cat" vs "dog" is distance 3 → rejected
    expect(isAnswerCorrect("cat", "dog")).toBe(false);
  });
});
