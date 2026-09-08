// 語彙一覧の表示

import type { VocabularyItemRow } from "../../db/schema";
import { VocabularyCard } from "./VocabularyCard";

export function VocabularyList({ items }: { items: VocabularyItemRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
        該当する語彙がありません。クイズを解くと語彙が自動的に追加されます。
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item) => (
        <VocabularyCard key={item.id} item={item} />
      ))}
    </div>
  );
}
