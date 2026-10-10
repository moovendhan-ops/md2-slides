"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/common/icon";
import { SectionHead } from "./section-head";

export function VideoDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <section id="demo" className="relative scroll-mt-20 overflow-hidden py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[500px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHead
          kicker="Video Walkthrough"
          title="See the studio in action."
          sub="Watch how effortlessly you can edit Markdown, explore themes, render live components, and present anywhere."
          center
        />

        <div className="mt-12">
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl backdrop-blur transition-all hover:border-zinc-700">
            {/* Window header */}
            <div className="flex h-11 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-500/80" />
                <span className="size-3 rounded-full bg-yellow-500/80" />
                <span className="size-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-1 font-mono text-xs text-zinc-400">
                <Icon name="slideshow" className="text-blue-400" />
                <span>md2slides.cybertechmind.com/app</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex size-7 items-center justify-center rounded-md border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  <Icon name={isMuted ? "speaker-slash" : "speaker-high"} />
                </button>
              </div>
            </div>

            {/* Video container */}
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                preload="metadata"
                autoPlay
                loop
                muted
                playsInline
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="size-full object-cover"
              >
                <source src="https://cdn.jsdelivr.net/gh/moovendhan-v/md2-slides@main/public/demo.mp4" type="video/mp4" />
                <source src="/demo.mp4" type="video/mp4" />
              </video>

              {/* Custom play overlay if paused */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity"
                  aria-label="Play video"
                >
                  <div className="flex size-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-2xl text-zinc-100 shadow-xl transition-transform hover:scale-110">
                    <Icon name="play" />
                  </div>
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-500">
            Interactive dashboard walkthrough showcasing live preview, template presets, and seamless presentation mode.
          </p>
        </div>
      </div>
    </section>
  );
}
