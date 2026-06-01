import { InputHTMLAttributes } from "react";

const baseClassName =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500";

export default function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className ? `${baseClassName} ${className}` : baseClassName} {...props} />;
}
