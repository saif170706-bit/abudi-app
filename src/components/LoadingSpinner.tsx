'use client';

export default function LoadingSpinner({
  size = "lg",
  message,
  className,
}: {
  size?: "sm" | "lg";
  message?: string;
  className?: string;
}) {
  return (
    <div className={className ?? ""}>
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-gray-800 ${size === "lg" ? "h-10 w-10" : "h-6 w-6"}`} />
        {message && <div className="text-sm text-gray-600">{message}</div>}
      </div>
    </div>
  );
}
