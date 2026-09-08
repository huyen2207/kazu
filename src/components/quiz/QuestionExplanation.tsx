// 回答後の日本語解説（CLAUDE.md セクション12）
// 正解・日本語訳・正解理由・全選択肢の解説・重要語彙・文法・コロケーションを表示する

import type { Question } from "../../types/question";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

export function QuestionExplanation({
  question,
  isCorrect,
}: {
  question: Question;
  isCorrect: boolean;
}) {
  const correctText =
    question.choices.find((c) => c.id === question.correctChoice)?.text ?? "";

  return (
    <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
      <div
        className={`rounded-md px-4 py-3 text-sm font-semibold ${
          isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
        }`}
      >
        {isCorrect ? "正解です！" : "不正解…"} 正解は{" "}
        <span className="text-base">
          {question.correctChoice}. {correctText}
        </span>
      </div>

      <Section title="日本語訳">
        <p className="text-sm leading-relaxed">{question.translationJP}</p>
      </Section>

      <Section title="解説">
        <p className="text-sm leading-relaxed">{question.explanationJP}</p>
      </Section>

      <Section title="選択肢の解説">
        <ul className="space-y-2">
          {question.choiceExplanations.map((exp) => (
            <li
              key={exp.choice}
              className={`rounded-md border px-3 py-2 text-sm leading-relaxed ${
                exp.choice === question.correctChoice
                  ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <span className="mr-1 font-bold">{exp.choice}.</span>
              {exp.explanationJP}
            </li>
          ))}
        </ul>
      </Section>

      {question.vocabulary.length > 0 && (
        <Section title="重要語彙">
          <ul className="space-y-1.5">
            {question.vocabulary.map((v) => (
              <li key={v.word} className="text-sm leading-relaxed">
                <span className="font-semibold text-indigo-700">{v.word}</span>
                <span className="mx-1.5 text-gray-400">
                  〔{v.partOfSpeech}〕
                </span>
                {v.meaningJP}
                {v.explanationJP && (
                  <span className="text-gray-500"> — {v.explanationJP}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {question.grammar.length > 0 && (
        <Section title="文法">
          <ul className="space-y-2">
            {question.grammar.map((g) => (
              <li
                key={g.pattern}
                className="rounded-md bg-gray-50 px-3 py-2 text-sm leading-relaxed"
              >
                <p>
                  <span className="font-semibold">{g.pattern}</span>
                  <span className="ml-2 text-gray-600">{g.meaningJP}</span>
                </p>
                <p className="mt-0.5 text-gray-600">{g.explanationJP}</p>
                {g.example && (
                  <p className="mt-1 text-gray-500">
                    例：{g.example}
                    {g.exampleJP && `（${g.exampleJP}）`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {question.collocations && question.collocations.length > 0 && (
        <Section title="コロケーション">
          <ul className="flex flex-wrap gap-2">
            {question.collocations.map((c) => (
              <li
                key={c.expression}
                className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-800"
              >
                {c.expression}
                <span className="ml-1 text-indigo-500">＝{c.meaningJP}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
