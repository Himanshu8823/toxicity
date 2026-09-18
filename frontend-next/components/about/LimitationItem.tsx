export interface LimitationItemProps {
  title: string;
  description: string;
}

/** One honest limitation entry. Server component. */
export function LimitationItem({ title, description }: LimitationItemProps) {
  return (
    <div className="hairline-card p-6">
      <h3 className="title-sm text-ink">{title}</h3>
      <p className="body-sm mt-2 text-body">{description}</p>
    </div>
  );
}

export default LimitationItem;
