import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LivePhoto, type LivePhotoHandle, type LivePhotoState } from './LivePhoto';

const props = { photoSrc: '/photo.jpg', videoSrc: '/motion.mp4', alt: '海岸' };
let playMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  playMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: vi.fn() });
});

const flush = () => act(async () => { await Promise.resolve(); });

describe('LivePhoto badge', () => {
  it('preserves the default icon, position and idle/playing labels', async () => {
    const { container } = render(<LivePhoto {...props} activation="toggle" />);
    const badge = container.querySelector<HTMLElement>('.live-photo__badge')!;
    expect(badge.textContent).toBe('实况');
    expect(badge.dataset.position).toBe('top-left');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.querySelector('svg.live-photo__mark')).not.toBeNull();
    fireEvent.click(screen.getByRole('button'));
    await flush();
    expect(badge.textContent).toBe('LIVE');
    fireEvent.click(screen.getByRole('button'));
    expect(badge.textContent).toBe('实况');
  });

  it('uses custom idle and playing labels and returns to idle text on stop', async () => {
    const ref = createRef<LivePhotoHandle>();
    const { container } = render(<LivePhoto ref={ref} {...props} badge={{ text: '动态照片', playingText: '播放中' }} />);
    const badge = container.querySelector('.live-photo__badge')!;
    expect(badge.textContent).toBe('动态照片');
    await act(async () => { await ref.current!.play(); });
    expect(badge.textContent).toBe('播放中');
    act(() => ref.current!.stop());
    expect(badge.textContent).toBe('动态照片');
  });

  it('renders a custom React icon instead of the default SVG', () => {
    const { container } = render(<LivePhoto {...props} badge={{ icon: <span data-testid="custom-icon">◉</span>, text: '瞬间' }} />);
    const badge = container.querySelector('.live-photo__badge')!;
    expect(badge.contains(screen.getByTestId('custom-icon'))).toBe(true);
    expect(badge.querySelector('svg.live-photo__mark')).toBeNull();
    expect(badge.textContent).toContain('瞬间');
  });

  it.each([null, false] as const)('hides the icon with icon=%s while retaining the label', icon => {
    const { container } = render(<LivePhoto {...props} badge={{ icon, text: '动态照片' }} />);
    const badge = container.querySelector('.live-photo__badge')!;
    expect(badge.textContent).toBe('动态照片');
    expect(badge.querySelector('svg')).toBeNull();
  });

  it('keeps the default icon for an explicitly undefined icon', () => {
    const { container } = render(<LivePhoto {...props} badge={{ icon: undefined }} />);
    expect(container.querySelector('.live-photo__badge svg.live-photo__mark')).not.toBeNull();
  });

  it('merges custom classes and playing styles, then restores base styles on stop', async () => {
    const ref = createRef<LivePhotoHandle>();
    const { container } = render(<LivePhoto ref={ref} {...props} badge={{
      className: 'brand-badge rounded-badge',
      style: { color: 'white', backgroundColor: 'navy', borderRadius: 6 },
      playingStyle: { color: 'gold', transform: 'scale(1.05)' },
    }} />);
    const badge = container.querySelector<HTMLElement>('.live-photo__badge')!;
    expect(badge.classList.contains('brand-badge')).toBe(true);
    expect(badge.classList.contains('rounded-badge')).toBe(true);
    expect(badge.style.color).toBe('white');
    expect(badge.style.backgroundColor).toBe('navy');
    expect(badge.style.borderRadius).toBe('6px');
    expect(badge.style.transform).toBe('');
    await act(async () => { await ref.current!.play(); });
    expect(badge.style.color).toBe('gold');
    expect(badge.style.backgroundColor).toBe('navy');
    expect(badge.style.transform).toBe('scale(1.05)');
    act(() => ref.current!.stop());
    expect(badge.style.color).toBe('white');
    expect(badge.style.backgroundColor).toBe('navy');
    expect(badge.style.transform).toBe('');
  });

  it.each(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const)('exposes the %s position', position => {
    const { container } = render(<LivePhoto {...props} badge={{ position }} />);
    expect(container.querySelector<HTMLElement>('.live-photo__badge')!.dataset.position).toBe(position);
  });

  it('provides loading, playing, paused and error state to a custom renderer', async () => {
    let resolvePlay!: () => void;
    playMock.mockImplementation(() => new Promise<void>(resolve => { resolvePlay = resolve; }));
    const ref = createRef<LivePhotoHandle>();
    const renderBadge = vi.fn(({ state, isPlaying }: { state: LivePhotoState; isPlaying: boolean }) => (
      <span data-testid="rendered-badge">{`${state}:${isPlaying}`}</span>
    ));
    const { container } = render(<LivePhoto ref={ref} {...props} activation="toggle" renderBadge={renderBadge} />);
    expect(screen.getByTestId('rendered-badge').textContent).toBe('idle:false');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('rendered-badge').textContent).toBe('loading:false');
    expect(renderBadge).toHaveBeenLastCalledWith({ state: 'loading', isPlaying: false });
    await act(async () => { resolvePlay(); });
    expect(screen.getByTestId('rendered-badge').textContent).toBe('playing:true');
    expect(renderBadge).toHaveBeenLastCalledWith({ state: 'playing', isPlaying: true });
    act(() => ref.current!.pause());
    expect(screen.getByTestId('rendered-badge').textContent).toBe('paused:false');
    expect(renderBadge).toHaveBeenLastCalledWith({ state: 'paused', isPlaying: false });
    fireEvent.error(container.querySelector('video')!);
    expect(screen.getByTestId('rendered-badge').textContent).toBe('error:false');
    expect(renderBadge).toHaveBeenLastCalledWith({ state: 'error', isPlaying: false });
    expect(container.querySelector('.live-photo__badge svg')).toBeNull();
  });

  it('omits the badge when a custom renderer returns null', () => {
    const renderBadge = vi.fn(() => null);
    const { container } = render(<LivePhoto {...props} renderBadge={renderBadge} />);
    expect(renderBadge).toHaveBeenCalledWith({ state: 'idle', isPlaying: false });
    expect(container.querySelector('.live-photo__badge')).toBeNull();
  });

  it('applies the visibility switch before invoking a custom renderer', () => {
    const renderBadge = vi.fn(() => <span>品牌实况</span>);
    const { container } = render(<LivePhoto {...props} showBadge={false} badge={{ text: '动态照片' }} renderBadge={renderBadge} />);
    expect(container.querySelector('.live-photo__badge')).toBeNull();
    expect(renderBadge).not.toHaveBeenCalled();
  });

  it('never invokes or displays the badge renderer for a still image', () => {
    const renderBadge = vi.fn(() => <span>品牌实况</span>);
    const { container } = render(<LivePhoto photoSrc="/still.jpg" alt="静态海岸" showBadge renderBadge={renderBadge} />);
    expect(container.querySelector('.live-photo__badge')).toBeNull();
    expect(renderBadge).not.toHaveBeenCalled();
  });
});
