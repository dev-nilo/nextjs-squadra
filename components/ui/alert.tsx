type AlertTone = "danger" | "warning" | "success" | "info";

const TONE_STYLES: Record<AlertTone, string> = {
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning-600",
  success: "bg-success/10 text-success",
  info: "bg-default-100 text-default-700",
};

export function Alert({
  tone = "info",
  className = "",
  id,
  children,
}: {
  tone?: AlertTone;
  className?: string;
  /** For a field's aria-describedby, when the alert is about that field. */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
