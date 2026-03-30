type UserAvatarProps = {
  imageUrl?: string | null
  name?: string | null
  className?: string
}

const getInitials = (name?: string | null) => {
  const value = (name || '').trim()
  if (!value) return 'U'
  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

export default function UserAvatar({ imageUrl, name, className = '' }: UserAvatarProps) {
  const initials = getInitials(name)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ? `${name} profile` : 'User profile'}
        className={`h-12 w-12 rounded-full object-cover ring-1 ring-slate-200 ${className}`.trim()}
      />
    )
  }

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 ${className}`.trim()}
      aria-label={name ? `${name} avatar` : 'User avatar'}
    >
      {initials}
    </div>
  )
}
