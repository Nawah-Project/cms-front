/** Responsive encodings of the same photo; mobile never selects the desktop file. */
export function ProfessionalImage({
  className,
  sizes = "100vw",
  priority = "high",
}: {
  className?: string;
  sizes?: string;
  priority?: "high" | "low";
}) {
  const base = "/images/nawah-professional-v2";
  return (
    <picture className="contents">
      <source
        media="(max-width: 600px)"
        srcSet={`${base}-480.webp 480w, ${base}-768.webp 768w`}
        sizes="100vw"
      />
      <source
        media="(max-width: 900px)"
        srcSet={`${base}-768.webp 768w, ${base}-1024.webp 1024w, ${base}-1200.webp 1200w`}
        sizes="100vw"
      />
      <img
        src={`${base}-768.webp`}
        srcSet={`${base}-768.webp 768w, ${base}-1024.webp 1024w, ${base}-1200.webp 1200w, ${base}.webp 1536w`}
        sizes={sizes}
        width={1536}
        height={1024}
        alt=""
        aria-hidden="true"
        className={className}
        fetchPriority={priority}
        decoding="async"
      />
    </picture>
  );
}
