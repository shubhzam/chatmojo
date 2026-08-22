import { timeLabel } from "../lib/format";

export function MessageBubble({
  content,
  createdAt,
  isOwn,
  senderLabel,
}: {
  content: string;
  createdAt: string;
  isOwn: boolean;
  senderLabel?: string;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm ${
          isOwn ? "bg-wa-bubble-out" : "bg-wa-bubble-in"
        }`}
      >
        {senderLabel && <p className="text-xs font-medium text-wa-teal">{senderLabel}</p>}
        <p className="whitespace-pre-wrap break-words text-sm text-wa-text">{content}</p>
        <p className="mt-0.5 text-right text-[10px] text-wa-muted">{timeLabel(createdAt)}</p>
      </div>
    </div>
  );
}
