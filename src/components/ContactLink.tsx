interface ContactLinkProps {
  phone: string | null
  website: string | null
}

export default function ContactLink({ phone, website }: ContactLinkProps) {
  if (phone) {
    return (
      <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="hover:text-brass hover:underline">
        {phone}
      </a>
    )
  }
  if (website) {
    const href = website.startsWith('http') ? website : `https://${website}`
    return (
      <a href={href} target="_blank" rel="noreferrer" className="hover:text-brass hover:underline">
        {website}
      </a>
    )
  }
  return <span>—</span>
}
