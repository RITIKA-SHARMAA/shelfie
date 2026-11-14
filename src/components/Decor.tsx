/** The small objects that stand at either end of the shelf. Purely decorative. */

export function Vase() {
  return (
    <svg width="62" height="150" viewBox="0 0 64 150" aria-hidden="true">
      <path d="M32 6 C 26 40, 48 50, 40 70" stroke="#7d8a6a" strokeWidth="2" fill="none" />
      <path d="M32 10 C 40 30, 20 46, 24 70" stroke="#7d8a6a" strokeWidth="2" fill="none" />
      <ellipse cx="44" cy="40" rx="8" ry="4" fill="#9aa585" transform="rotate(-30 44 40)" />
      <ellipse cx="22" cy="34" rx="8" ry="4" fill="#9aa585" transform="rotate(30 22 34)" />
      <path d="M20 70 h24 c4 0 8 6 8 20 c0 30 -8 58 -20 58 c-12 0 -20 -28 -20 -58 c0 -14 4 -20 8 -20z" fill="#e4d9c6" stroke="#c9bba3" />
    </svg>
  );
}

export function Pot() {
  return (
    <svg width="70" height="96" viewBox="0 0 70 96" aria-hidden="true">
      <path d="M35 50 C 35 34, 22 28, 14 30 C 18 40, 26 46, 35 50z" fill="#8f9c7c" />
      <path d="M35 50 C 36 30, 48 20, 58 22 C 54 36, 46 44, 35 50z" fill="#7d8a6a" />
      <path d="M35 50 C 33 38, 36 26, 42 16 C 44 30, 40 42, 35 50z" fill="#a3ae90" />
      <path d="M14 52 h42 l-4 40 h-34z" fill="#b9afa0" />
      <rect x="12" y="50" width="46" height="6" rx="2" fill="#a89e8f" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return <span className={`font-serif text-[30px] font-semibold tracking-[0.02em] ${className}`}>shelfie</span>;
}
