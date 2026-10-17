interface AvatarProps {
  name: string | null;
  color: string | null;
  small?: boolean;
}

export default function Avatar({ name, color, small = false }: AvatarProps) {
  return (
    <span className={`user-avatar ${small ? "sm" : ""}`} style={{ background: color ?? "#5d7185" }}>
      {(name ?? "?").charAt(0)}
    </span>
  );
}
