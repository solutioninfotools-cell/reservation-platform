/** Carte statistique générique — réutilisée par les 3 tableaux de bord (Admin/Pro/Réceptionniste). */
export function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="bg-white border border-line rounded-xl2 p-4">
      <div className="text-2xl font-extrabold mb-1" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="text-[11px] font-semibold text-ink-soft">{label}</div>
    </div>
  );
}
