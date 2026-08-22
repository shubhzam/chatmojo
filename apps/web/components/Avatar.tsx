import { initials, avatarColor } from "../lib/format";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
