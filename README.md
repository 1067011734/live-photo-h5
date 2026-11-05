# React Live Photo H5

跨平台实况图片组件：传入照片和视频 URL，默认显示静态照片，按住播放短视频，松开回到照片。提供 React + TypeScript 源码、可构建的组件包、中文演示页和测试。

## 运行

```bash
npm install
npm run dev
```

打开终端输出的地址，默认 http://localhost:5173 。手机与电脑处于同一局域网时，可打开终端输出的 Network 地址体验。项目使用兼容本机 Node 18 的 Vite 6；新环境建议使用受支持的 Node LTS。

```bash
npm test          # 组件测试
npm run build    # 生成演示站 dist/
npm run build:lib # 生成 ESM 组件、CSS、类型到 lib/
npm run test:e2e  # 本机 Chrome 的真实视频播放与移动触控模拟
```

浏览器测试默认使用 macOS `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。其他系统设置 `CHROME_PATH` 为 Chrome 可执行文件路径。

## 在项目中使用

组件使用原生 `<img>` / `<video>`，由业务方提供可播放的照片和视频 URL。

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
import { LivePhoto } from '@local/live-photo-react';
import '@local/live-photo-react/style.css';
```

`@local/live-photo-react` 是本地包名，本项目未发布到 npm。React 18+ 为 peer dependency，不打进组件包。

## 迁入现有 React 项目与依赖

已有 React 18+ 项目无需安装额外运行依赖，`dependencies` 可以为空。组件由宿主项目提供 `react` / `react-dom`，本包通过 `peerDependencies` 声明版本要求。

迁移源码时复制 `src/lib/LivePhoto.tsx` 和 `src/lib/live-photo.css`，从组件文件直接引入即可；需要统一入口时再复制 `src/lib/index.ts`。测试文件无需迁入。

```tsx
import { LivePhoto } from './components/LivePhoto';
```

`LivePhoto.tsx` 已引入同目录 CSS，请保持两个文件的相对位置。如果使用构建后的 npm 包，则按上面的方式显式引入 `@local/live-photo-react/style.css`。

`lucide-react` 仅用于演示页图标；Vite、TypeScript、Vitest、Testing Library、Playwright 仅用于开发和测试，保留在 `devDependencies` 中，迁移播放组件时无需安装。TypeScript 项目若缺少 React 类型声明，可安装 `@types/react` / `@types/react-dom` 作为开发依赖。

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

## 素材接入

| 资源 | 接入方式 |
| --- | --- |
| 静态封面 | `photoSrc`，推荐 JPEG / PNG / WebP URL |
| 实况短视频 | `videoSrc`，推荐 H.264 编码的 MP4 URL |
| 视频候选源 | `sources`，由浏览器选择支持的类型 |
| 普通图片 | 仅传 `photoSrc`，正常显示静态照片 |

iOS Live Photo、Android Motion Photo 等原片应由业务方或服务端预先分离成照片和视频资源，再传给组件。组件只负责 URL 播放，不包含本地文件选择、原片解析、图片格式转换或视频转码。

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
- 请预先将原片处理为浏览器支持的图片与视频，再传入 URL。HEIC 封面若需要跨端显示，请由业务方转换为 JPEG / WebP。
- MOV / MP4 是容器，是否播放取决于真实编码、系统及硬件。HEVC 不保证在所有 Android / iOS 浏览器上解码；本组件不在浏览器内转码视频。跨端上线优先提供 JPEG + **H.264 / yuv420p MP4**，有声素材使用 AAC。
- `sources` 是浏览器原生候选源选择，不保证解码到中途失败后继续切换。需要确定性跨端兼容时直接提供已经转好的 H.264 源；错误通过 `onError` 返回。
- 远程素材应使用 HTTPS，支持视频 Range 请求、正确 Content-Type；配置 `crossOrigin` 时服务端需允许相应 CORS。部分 App WebView、低电量模式或浏览器策略仍可能拒绝播放，应保留点击重试。
- 浏览器测试覆盖真实 H.264 视频播放和手机尺寸触控模拟；未进行 iPhone / Android 真机验证。

## 方案依据与依赖

- [Apple LivePhotosKit JS](https://developer.apple.com/documentation/LivePhotosKitJS)：参考静态图 + 视频资源模型和实况交互。项目未依赖 Apple CDN 播放器，避免将 Android 支持绑定在其旧 SDK 上。
- [Chrome 自动播放策略](https://developer.chrome.com/blog/autoplay)及 [WebKit 内联视频策略](https://webkit.org/blog/6784/new-video-policies-for-ios/)：参考用户手势、静音及 `playsinline` 行为。
- React + TypeScript；演示页图标使用 Lucide，构建与测试使用 Vite、Vitest、Testing Library 和 Playwright。

`public/demo/coast.mp4` 来自 [Vide 的 ocean 示例](https://github.com/vodkabears/Vide/tree/master/examples/video)，`coast.jpg` 是它的首帧。原仓库为 MIT 许可，许可副本见同目录。此处仅使用示例媒体，未引入 Vide 播放器。可选 macOS 抽帧脚本见 `scripts/prepare-demo.swift`。
