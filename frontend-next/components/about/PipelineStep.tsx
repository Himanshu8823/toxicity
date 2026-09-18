export interface PipelineStepProps {
  number: string;
  title: string;
  description: string;
}

/** A single numbered step in the "how it works" pipeline. Server component. */
export function PipelineStep({ number, title, description }: PipelineStepProps) {
  return (
    <div className="flex gap-5">
      <span className="display-sm shrink-0 text-muted-soft" aria-hidden="true">
        {number}
      </span>
      <div>
        <h3 className="title-md text-ink">{title}</h3>
        <p className="body-sm mt-2 max-w-[52ch] text-body">{description}</p>
      </div>
    </div>
  );
}

export default PipelineStep;
