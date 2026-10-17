export default function Avatar({ name, color, small = false }) {
  return (
    <span className={`user-avatar ${small ? "sm" : ""}`} style={{ background: color ?? "#5d7185" }}>
      {(name ?? "?")[0]}
    </span>
  );
}
