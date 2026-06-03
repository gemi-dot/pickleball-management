import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  size = "md",
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export function TextInput({ ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg border border-line bg-white text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
    />
  );
}

interface SelectInputProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string | number; label: string }>;
}

export function SelectInput({ options, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 rounded-lg border border-line bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="">Select an option</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className="w-full px-3 py-2 rounded-lg border border-line bg-white text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
    />
  );
}
