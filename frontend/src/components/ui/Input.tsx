import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

const base = 'w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-paper text-ink focus:outline-none focus:border-primary transition';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className || ''}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} ${props.className || ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${base} ${props.className || ''}`} />;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}
