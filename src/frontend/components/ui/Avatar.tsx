interface AvatarProps {
  name: string;
  initials: string;
  color: string;
  size?: number;
}

export function Avatar({ name, initials, color, size = 24 }: AvatarProps) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.38,
      }}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
