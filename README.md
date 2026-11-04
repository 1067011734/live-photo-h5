# React Live Photo H5

跨平台实况图片组件：默认显示静态照片，按住播放短视频，松开回到照片。提供 React + TypeScript 源码、可构建的组件包、中文演示页和测试。

## 运行

```bash
npm install
npm run dev
```

打开终端输出的地址，默认 http://localhost:5173 。手机与电脑处于同一局域网时，可打开终端输出的 Network 地址体验。项目使用兼容本机 Node 18 的 Vite 6；新环境建议使用受支持的 Node LTS。

```bash
npm test          # 组件与格式解析测试
npm run build    # 生成演示站 dist/
npm run build:lib # 生成 ESM 组件、CSS、类型到 lib/
npm run test:e2e  # 本机 Chrome 的真实视频播放与移动触控模拟
```

浏览器测试默认使用 macOS `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。其他系统设置 `CHROME_PATH` 为 Chrome 可执行文件路径。

## 在项目中使用

可以直接复制 `src/lib/`；组件使用原生 `<img>` / `<video>`，HEIC 导入按需加载 `heic-to` 解码器。

```tsx
import { LivePhoto } from './lib/LivePhoto';
import './lib/live-photo.css';

export function Example() {
  return (
    <LivePhoto
      photoSrc="/photos/IMG_001.jpg"
      videoSrc="/photos/IMG_001.mp4"
      alt="海岸边的一段回忆"
      activation="press"
      muted
      aspectRatio="4 / 3"
      onError={(error) => console.error(error)}
    />
  );
}
```

复用构建包时，先执行 `npm run build:lib` 和 `npm pack`，在另一个项目中安装生成的 `.tgz`，然后使用：

```tsx
import { LivePhoto, resolveLivePhoto } from '@local/live-photo-react';
import '@local/live-photo-react/style.css';
```

`@local/live-photo-react` 是本地包名，本项目未发布到 npm。React 18+ 为 peer dependency，不打进组件包。

## 宽高设置

### 模式一：直接设置组件尺寸

通过 `style` 指定组件的宽高，数字的单位为 px：

```tsx
<LivePhoto
  photoSrc="/photo.jpg"
  videoSrc="/motion.mp4"
  alt="实况照片"
  style={{ width: 320, height: 240 }}
/>
```

需要响应式尺寸时，只设置宽度，通过 `aspectRatio` 自动计算高度：

```tsx
<LivePhoto
  photoSrc="/photo.jpg"
  videoSrc="/motion.mp4"
  alt="实况照片"
  style={{ width: '100%' }}
  aspectRatio="16 / 9"
/>
```

组件默认宽度为父容器的 `100%`，默认比例为 `4 / 3`。同时指定明确的宽度与高度时，尺寸以 `style` 为准，`aspectRatio` 不再决定宽高。

### 模式二：占满固定宽高的父容器

父容器设置固定宽高，组件的宽高均设置为 `100%`：

```tsx
<div style={{ width: 320, height: 400 }}>
  <LivePhoto
    photoSrc="/photo.jpg"
    videoSrc="/motion.mp4"
    alt="实况照片"
    style={{ width: '100%', height: '100%' }}
    objectFit="cover"
  />
</div>
```

此时组件完全跟随父容器尺寸，不需要设置 `aspectRatio`。父容器需要有明确的高度，仅设置父容器宽度或 `height: auto` 无法用 `height: '100%'` 确定组件高度。

两种模式都可通过 `objectFit` 控制图片和视频的显示方式：`cover`（默认）等比例裁切并填满，`contain` 等比例完整显示，可能留白。

## 本地文件导入

```tsx
import { useEffect, useState } from 'react';
import { LivePhoto, resolveLivePhoto, type ResolvedLivePhoto } from './lib';

export function LocalExample() {
  const [media, setMedia] = useState<ResolvedLivePhoto | null>(null);
  useEffect(() => () => media?.dispose(), [media]);

  return <>
    <input type="file" multiple accept="image/*,video/*,.heic,.heif,.mov"
      onChange={async (event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        if (!files.length) return;
        try {
          setMedia(await resolveLivePhoto(files));
        } catch (error) {
          console.error(error);
        }
      }} />
    {media && <LivePhoto photoSrc={media.photoSrc} videoSrc={media.videoSrc} alt="我的实况照片" />}
  </>;
}
```

上例展示基本接入。可连续导入、取消或卸载的生产流程请参考 `src/App.tsx`，它用 `AbortController` 取消旧任务，并释放替换前的 object URL。导入工具只在本地读取文件，不上传资源。

`resolveLivePhoto(fileOrFiles, { signal?, maxFileSize? })` 返回 `photoSrc`、可选 `videoSrc`、`format`、可选 `photoTime`（秒）及 `dispose()`。`photoTime` 当前仅来自 JPEG XMP，作为额外元数据返回，不参与播放起点；播放始终从视频开头开始。默认每文件上限 100 MiB，最多 20 个输入；唯一同名图片和视频优先配对，多组同名素材会提示歧义。

调用方在资源不用时调用 `dispose()`。它可重复调用，释放本次生成的全部 URL。异步取消与失败路径会自行清理。`LivePhotoImportError.code` 区分文件过大、缺图、配对歧义、格式损坏及 HEIC 解码失败等错误。

## 支持的素材

| 素材 | 支持方式 |
| --- | --- |
| iOS Live Photo | 导出的 JPG / HEIC 照片 + 对应 MOV / MP4，优先同名配对 |
| Google 旧式 Motion Photo | JPEG XMP `MicroVideoOffset`，分离内嵌 MP4 |
| Google 新式 Motion Photo | XMP `Container:Directory` / `Item:Length`，处理 padding 和额外资源 |
| Samsung JPEG 动态照片 | XMP 或 JPEG 后的有效 MP4，校验并裁掉已知 SEF 尾部 |
| Android 标准 HEIC / AVIF 动态照片 | 顶层 `mpvd` 容器；HEIC 封面转 JPEG，AVIF 封面由浏览器显示 |
| 普通图片 | 正常显示静态照片，无播放按钮 |
| 已处理的线上素材 | 直接传照片和短视频 URL，无需导入器 |

解析器验证 JPEG 标记、XMP 数值范围及 MP4 box 边界，避免把图片中的随机 `ftyp` 字节误当视频；保留 Ultra HDR / MPF 附加图片数据。私有厂商容器不保证全部可识别，建议服务端统一输出 JPG + H.264 MP4。

## 播放 API

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| `photoSrc`, `alt` | 必传 | 静态照片 URL 与无障碍描述 |
| `videoSrc` | 无 | 短视频 URL；省略时显示静态图 |
| `sources` | 无 | 有序 `{ src, type? }[]`；传入后优先于 `videoSrc`，使用原生 source 选择 |
| `activation` | `press` | `press` 按住、`toggle` 点击切换、`hover` 鼠标移入 |
| `muted`, `loop` | `true`, `false` | 静音、循环 |
| `preload` | `metadata` | `none` / `metadata` / `auto`，由浏览器决定加载量 |
| `objectFit`, `aspectRatio` | `cover`, `4 / 3` | 图片与视频统一裁切及比例 |
| `disabled` | `false` | 禁止交互并停止播放 |
| `showBadge`, `showHint` | `true`, `true` | 实况标识与操作提示 |
| `className`, `style`, `crossOrigin` | 无 | 自定义外观、跨域模式 |
| `onStateChange` | 无 | `idle` / `loading` / `playing` / `paused` / `error` |
| `onProgress` | 无 | `{ currentTime, duration }`，单位秒 |
| `onError` | 无 | 原图、视频或播放权限错误；`play()` 内部捕获失败并通知此回调 |

`ref: LivePhotoHandle` 提供 `play(): Promise<void>`、`pause()`、`stop()`、只读 `video`。`pause()` 保留当前视频帧，`stop()` 恢复静态照片并重置到 0。无障碍支持 Space 按住播放、Enter 切换及屏幕阅读器操作。

为了保留移动浏览器的用户激活，按住模式在 `pointerdown` 同步调用 `play()`，不设置长按延时。松手、指针移出／取消、焦点离开、页面隐藏和离屏都会停止；保留纵向滚动和双指缩放，滚动取消会停止播放。

## 浏览器与原片边界

- 播放层设置 `muted`、`playsInline` 及兼容 WebView 的内联属性，捕获播放 Promise 失败并保留重试入口。
- iOS 相册通过普通网页 `<input>` 常常只返回静态图，H5 无法据此还原被系统丢掉的视频。请导出「未修改的原片」照片和视频后同时导入；App 内可由原生桥接提供两份资源。
- MOV / MP4 是容器，是否播放取决于真实编码、系统及硬件。HEVC 不保证在所有 Android / iOS 浏览器上解码；本组件不在浏览器内转码视频。跨端上线优先提供 JPEG + **H.264 / yuv420p MP4**，有声素材使用 AAC。
- `sources` 是浏览器原生候选源选择，不保证解码到中途失败后继续切换。需要确定性跨端兼容时直接提供已经转好的 H.264 源；错误通过 `onError` 返回。
- 远程素材应使用 HTTPS，支持视频 Range 请求、正确 Content-Type；配置 `crossOrigin` 时服务端需允许相应 CORS。部分 App WebView、低电量模式或浏览器策略仍可能拒绝播放，应保留点击重试。
- 已在本机 Chrome 验证真实 H.264 视频播放、配对与内嵌素材导入，以及手机尺寸触控模拟；未进行 iPhone / Android 真机验证。HEIC 解码测试使用 mock，项目未附真实 HEIC 样本。

## 方案依据与依赖

- [Apple LivePhotosKit JS](https://developer.apple.com/documentation/LivePhotosKitJS)：参考静态图 + 视频资源模型和实况交互。项目未依赖 Apple CDN 播放器，避免将 Android 支持绑定在其旧 SDK 上。
- [Android Motion Photo 格式](https://developer.android.com/media/platform/motion-photo-format)及 [Google Media3 解析器](https://github.com/androidx/media/blob/release/libraries/extractor/src/main/java/androidx/media3/extractor/jpeg/XmpMotionPhotoDescriptionParser.java)：参考 XMP 格式与视频定位规则。
- [Chrome 自动播放策略](https://developer.chrome.com/blog/autoplay)及 [WebKit 内联视频策略](https://webkit.org/blog/6784/new-video-policies-for-ios/)：参考用户手势、静音及 `playsinline` 行为。
- [heic-to](https://github.com/hoppergee/heic-to)：HEIC → JPEG，独立懒加载 chunk，约 3.2 MB（gzip 约 790 KB），仅导入 HEIC 时请求。
- React + TypeScript；演示页图标使用 Lucide，构建与测试使用 Vite、Vitest、Testing Library 和 Playwright。

`public/demo/coast.mp4` 来自 [Vide 的 ocean 示例](https://github.com/vodkabears/Vide/tree/master/examples/video)，`coast.jpg` 是它的首帧。原仓库为 MIT 许可，许可副本见同目录。此处仅使用示例媒体，未引入 Vide 播放器。可选 macOS 抽帧脚本见 `scripts/prepare-demo.swift`。
