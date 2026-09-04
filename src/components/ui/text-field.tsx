type Props = {
  label: string;
  /**
   * Form field name. Always set this on inputs inside a form: without it the
   * value has to be mirrored into a hidden input from React state, and
   * browser or keychain autofill frequently sets the DOM value without
   * firing React's change event — so the field looks filled and an empty
   * string is submitted.
   */
  name?: string;
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
  name,
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
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[3px] border bg-surface px-3.5 py-3 text-bone placeholder:text-bone-3 focus:outline-none ${
          error ? "border-danger" : "border-line focus:border-bone-3"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
