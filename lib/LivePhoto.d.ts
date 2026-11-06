import { type CSSProperties, type ReactNode } from 'react';
import './live-photo.css';
export type LivePhotoState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export interface LivePhotoVideoSource {
    src: string;
    type?: string;
}
export type LivePhotoBadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export interface LivePhotoBadgeOptions {
    /** Label shown outside the playing state. Defaults to 实况. */
    text?: string;
    /** Label shown while playing. Defaults to LIVE. */
    playingText?: string;
    position?: LivePhotoBadgePosition;
    /** Custom decorative icon. Pass null or false to hide the default icon. */
    icon?: ReactNode;
    className?: string;
    style?: CSSProperties;
    /** Merged over style only while playing. */
    playingStyle?: CSSProperties;
}
export interface LivePhotoBadgeRenderContext {
    state: LivePhotoState;
    isPlaying: boolean;
}
export interface LivePhotoHandle {
    play(): Promise<void>;
    pause(): void;
    stop(): void;
    readonly video: HTMLVideoElement | null;
}
export interface LivePhotoProps {
    photoSrc: string;
    videoSrc?: string;
    /** The video URL is being resolved. Shows the poster and a pending hint until a source is available. */
    videoLoading?: boolean;
    /** Ordered alternatives, e.g. HEVC followed by an H.264 MP4. */
    sources?: readonly LivePhotoVideoSource[];
    alt: string;
    activation?: 'press' | 'toggle' | 'hover';
    muted?: boolean;
    loop?: boolean;
    /** Maximum media timeline per pass in seconds. With loop, repeat this segment. */
    maxDuration?: number;
    disabled?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
    objectFit?: 'cover' | 'contain';
    aspectRatio?: CSSProperties['aspectRatio'];
    className?: string;
    style?: CSSProperties;
    /** Master visibility switch. Badges are always hidden for still images. */
    showBadge?: boolean;
    /** Badge appearance, also applied to the renderBadge wrapper. */
    badge?: LivePhotoBadgeOptions;
    /** Replace decorative badge contents. Return null to hide it for a state. */
    renderBadge?(context: LivePhotoBadgeRenderContext): ReactNode;
    showHint?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials';
    onStateChange?(state: LivePhotoState): void;
    onError?(error: Error): void;
    onProgress?(progress: {
        currentTime: number;
        duration: number;
    }): void;
}
/** Still image + native inline video. No device sniffing or remote player SDK. */
export declare const LivePhoto: import("react").ForwardRefExoticComponent<LivePhotoProps & import("react").RefAttributes<LivePhotoHandle>>;
