// 問題文の表示。空欄（______）を視覚的に強調する。

export function QuestionCard({ sentence }: { sentence: string }) {
  const parts = sentence.split(/_{2,}/);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-lg leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="mx-1 inline-block min-w-24 rounded border-b-2 border-indigo-400 bg-indigo-50 px-3 text-center text-indigo-400">
                ？
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
