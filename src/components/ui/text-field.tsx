type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  autoComplete?: string;
  error?: string;
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  optional = false,
  autoComplete,
  error,
}: Props) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-bone-2">
        {label}
        {optional && <span className="ml-1.5 text-bone-3">optional</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[3px] border bg-surface px-3.5 py-3 text-bone placeholder:text-bone-3 focus:outline-none ${
          error ? "border-accent" : "border-line focus:border-bone-3"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-accent">{error}</span>}
    </label>
  );
}
