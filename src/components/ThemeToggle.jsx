export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="btn-secondary gap-2 px-4"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accentSoft text-accent">
        {isDark ? 'L' : 'D'}
      </span>
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
