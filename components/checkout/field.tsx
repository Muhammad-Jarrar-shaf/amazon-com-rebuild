import type { HTMLInputAutoCompleteAttribute, ReactNode, Ref } from "react";

const CONTROL =
  "mt-1 block min-h-[var(--tap)] w-full rounded-md border bg-white px-3 text-base text-ink placeholder:text-[#767676] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-link";

interface FieldShell {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  className?: string;
}

function Shell({ id, label, error, hint, className = "", children }: FieldShell & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-deal">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

interface TextFieldProps extends FieldShell {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/** A labeled text input with an associated hint and error (aria-invalid, aria-describedby). */
export function TextField({ id, label, error, hint, className, value, onChange, onBlur, autoComplete, inputMode, maxLength, placeholder, inputRef }: TextFieldProps) {
  return (
    <Shell id={id} label={label} error={error} hint={hint} className={className ?? ""}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${CONTROL} ${error ? "border-deal" : "border-[#888c8c]"}`}
      />
    </Shell>
  );
}

interface SelectFieldProps extends FieldShell {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  options: readonly (readonly [value: string, label: string])[];
  placeholder: string;
}

export function SelectField({ id, label, error, hint, className, value, onChange, onBlur, autoComplete, options, placeholder }: SelectFieldProps) {
  return (
    <Shell id={id} label={label} error={error} hint={hint} className={className ?? ""}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${CONTROL} ${error ? "border-deal" : "border-[#888c8c]"}`}
      >
        <option value="">{placeholder}</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </Shell>
  );
}
