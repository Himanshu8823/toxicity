import Image from 'next/image';
import type { VideoInfo } from '@/lib/types';

export interface VideoHeaderProps {
  videoInfo: VideoInfo;
}

/** Bare inline SVG external-link glyph — no icon font, no emoji. */
function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

/**
 * Video identity strip at the top of the results page. Thumbnail is optional
 * — YouTube occasionally omits it, or the string can be empty — so a plain
 * ink-on-hairline placeholder stands in rather than a broken <Image>.
 */
export function VideoHeader({ videoInfo }: VideoHeaderProps) {
  const hasThumbnail = Boolean(videoInfo.thumbnail && videoInfo.thumbnail.trim().length > 0);
  const videoId = videoInfo.id?.trim();
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : null;

  return (
    <header className="editorial-container pt-8 sm:pt-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[var(--radius-xl)] border border-hairline bg-surface-strong sm:w-72">
          {hasThumbnail ? (
            <Image
              src={videoInfo.thumbnail}
              alt=""
              fill
              sizes="(min-width: 640px) 288px, 100vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="caption-uppercase text-muted">No thumbnail</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="display-md break-words text-ink">
            {videoInfo.title?.trim() || 'Untitled video'}
          </h1>
          <p className="body-md text-muted">
            {videoInfo.channelName?.trim() || 'Unknown channel'}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="body-sm text-body">
              <span className="body-strong text-ink">{videoInfo.viewCount || '0'}</span> views
            </span>
            <span className="body-sm text-body">
              <span className="body-strong text-ink">{videoInfo.commentCount || '0'}</span> comments
            </span>
          </div>
          {watchUrl ? (
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-type inline-flex w-fit items-center gap-1.5 text-ink underline decoration-hairline-strong underline-offset-4 hover:decoration-ink"
            >
              Watch on YouTube
              <ExternalLinkIcon />
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default VideoHeader;
