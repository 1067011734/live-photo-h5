import { jsxs as K, Fragment as Le, jsx as f } from "react/jsx-runtime";
import { forwardRef as _e, useRef as o, useState as G, useCallback as m, useImperativeHandle as Ne, useEffect as x } from "react";
const Re = _e(function({
  photoSrc: V,
  videoSrc: W,
  videoLoading: le = !1,
  sources: de,
  alt: fe,
  activation: p = "press",
  muted: U = !0,
  loop: j = !1,
  maxDuration: S,
  disabled: q = !1,
  preload: pe = "metadata",
  objectFit: z = "cover",
  aspectRatio: me = "4 / 3",
  className: ge = "",
  style: he,
  showBadge: ye = !0,
  badge: g,
  renderBadge: Q,
  showHint: ve = !0,
  crossOrigin: Z,
  onStateChange: ee,
  onError: re,
  onProgress: te
}, be) {
  const B = o(null), ne = o(null), n = o(null), C = o("idle"), i = o(!1), h = o(0), L = o(null), D = o(null), _ = o(!1), b = o(null), A = o(0), J = typeof S == "number" && Number.isFinite(S) && S > 0 ? S : void 0, k = o(J);
  k.current = J;
  const ie = o(j);
  ie.current = j;
  const N = o({ onStateChange: ee, onError: re, onProgress: te });
  N.current = { onStateChange: ee, onError: re, onProgress: te };
  const [P, ke] = G("idle"), [Pe, $] = G(null), [ce, O] = G(""), oe = de?.filter((e) => typeof e?.src == "string" && e.src.trim().length > 0).map((e) => ({ ...e, src: e.src.trim() })), u = oe?.length ? oe : typeof W == "string" && W.trim() ? [{ src: W.trim() }] : [], w = JSON.stringify([V, u]), y = le && u.length === 0, ue = o(y);
  ue.current = y;
  const I = y && P !== "error" ? "loading" : P, we = Pe === w, v = !q && u.length > 0, a = m(() => {
    A.current += 1, b.current !== null && typeof window.cancelAnimationFrame == "function" && window.cancelAnimationFrame(b.current), b.current = null;
  }, []), l = m((e) => {
    const r = k.current, c = Number.isFinite(e.duration) ? Math.max(0, e.duration) : void 0, E = r === void 0 ? c ?? 0 : Math.min(c ?? r, r), R = Number.isFinite(e.currentTime) ? Math.max(0, e.currentTime) : 0;
    N.current.onProgress?.({ currentTime: E > 0 ? Math.min(R, E) : R, duration: E });
  }, []), s = m((e) => {
    C.current !== e && (C.current = e, ke(e), N.current.onStateChange?.(e));
  }, []), t = m(() => {
    a(), i.current = !1, h.current += 1, L.current = null, D.current = null;
    const e = n.current;
    if (e) {
      e.pause();
      try {
        e.currentTime = 0;
      } catch {
      }
      l(e);
    } else
      N.current.onProgress?.({ currentTime: 0, duration: 0 });
    $(null), O(""), s(ue.current ? "loading" : "idle");
  }, [s, a, l]), d = m((e) => {
    const r = k.current;
    if (r !== void 0 && e.currentTime >= r) {
      if (ie.current && i.current) {
        try {
          e.currentTime = 0;
        } catch {
          return t(), !0;
        }
        return l(e), !1;
      }
      return t(), !0;
    }
    return !1;
  }, [t, l]), F = m(() => {
    if (a(), k.current === void 0 || !i.current || typeof window.requestAnimationFrame != "function") return;
    const e = A.current, r = () => {
      if (e !== A.current) return;
      b.current = null;
      const c = n.current;
      !c || !i.current || d(c) || !i.current || e !== A.current || (b.current = window.requestAnimationFrame(r));
    };
    b.current = window.requestAnimationFrame(r);
  }, [a, d]), M = m((e) => {
    a(), i.current = !1, h.current += 1, L.current = null, D.current = null, n.current?.pause(), $(null), O(e.message), s("error"), N.current.onError?.(e);
  }, [s, a]), T = m(async () => {
    const e = n.current;
    if (!v || !e || i.current && C.current !== "error") return;
    const r = ++h.current;
    i.current = !0, O(""), s("loading"), e.muted = U, (e.ended || k.current !== void 0 && e.currentTime >= k.current) && (e.currentTime = 0);
    try {
      if (await e.play(), r !== h.current || e !== n.current) return;
      if (i.current) {
        if (d(e)) return;
        $(w), s("playing"), F();
      }
    } catch (c) {
      if (r !== h.current || !i.current || e !== n.current) return;
      const E = c && typeof c == "object" && "name" in c && typeof c.name == "string" ? c.name : "", R = new Error(E === "NotAllowedError" ? "浏览器暂未允许播放，请直接点击重试，或开启静音。" : "视频无法播放，请检查资源，并提供 H.264 编码的 MP4 兼容源。");
      R.name = E || "LivePhotoPlaybackError", M(R);
    }
  }, [v, U, M, s, d, F, w]), se = m(() => {
    a(), i.current = !1, h.current += 1, n.current?.pause(), C.current !== "idle" && C.current !== "error" && s("paused");
  }, [s, a]);
  Ne(be, () => ({ play: T, pause: se, stop: t, get video() {
    return n.current;
  } }), [T, se, t]), x(() => {
    t();
    const e = n.current;
    return () => {
      a(), i.current = !1, h.current += 1, e?.pause();
    };
  }, [w, t, a]), x(() => {
    q && t();
  }, [q, t]), x(() => {
    u.length === 0 && t();
  }, [y, u.length, t]), x(() => {
    const e = n.current;
    !e || d(e) || (l(e), F());
  }, [J, d, l, F]), x(() => {
    const e = () => {
      document.hidden && t();
    };
    document.addEventListener("visibilitychange", e), window.addEventListener("blur", t);
    let r;
    return typeof IntersectionObserver < "u" && B.current && (r = new IntersectionObserver(([c]) => {
      c.isIntersecting || t();
    }), r.observe(B.current)), () => {
      document.removeEventListener("visibilitychange", e), window.removeEventListener("blur", t), r?.disconnect();
    };
  }, [t]);
  function ae() {
    i.current ? t() : T();
  }
  function Te(e) {
    !v || p !== "press" || e.button !== 0 || !e.isPrimary || (L.current = e.pointerId, e.currentTarget.setPointerCapture?.(e.pointerId), T());
  }
  function X(e) {
    L.current === e.pointerId && t();
  }
  function Ee(e) {
    !v || e.key !== " " && e.key !== "Enter" || (e.preventDefault(), !e.repeat && (_.current = !0, p === "press" && e.key === " " ? (D.current = e.key, T()) : ae()));
  }
  const Ce = y ? "实况链接准备中…" : u.length === 0 ? "静态照片" : P === "loading" ? "正在加载动态画面…" : P === "playing" ? p === "press" ? "松开，回到这一刻" : "再次点击，回到照片" : P === "error" ? "点击重试" : p === "press" ? "按住，感受这一刻" : p === "hover" ? "移入或点击，播放实况" : "点击，播放实况", Y = I === "playing", H = ye && (u.length > 0 || y) ? Q ? Q({ state: I, isPlaying: Y }) : /* @__PURE__ */ K(Le, { children: [
    g?.icon === void 0 ? /* @__PURE__ */ K("svg", { className: "live-photo__mark", width: "19", height: "19", viewBox: "0 0 24 24", fill: "none", children: [
      /* @__PURE__ */ f("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "1.5", strokeDasharray: "1 3", strokeLinecap: "round" }),
      /* @__PURE__ */ f("circle", { cx: "12", cy: "12", r: "6.5", stroke: "currentColor", strokeWidth: "1.5" }),
      /* @__PURE__ */ f("circle", { cx: "12", cy: "12", r: "2.8", fill: "currentColor" })
    ] }) : g.icon,
    /* @__PURE__ */ f("span", { className: "live-photo__badge-text", children: Y ? g?.playingText ?? "LIVE" : g?.text ?? "实况" })
  ] }) : null;
  return /* @__PURE__ */ K(
    "div",
    {
      ref: B,
      className: `live-photo ${ge}`.trim(),
      style: { aspectRatio: me, ...he },
      "data-state": I,
      "data-video-loading": y,
      "data-has-video": u.length > 0,
      "data-frame-visible": we,
      role: u.length > 0 ? "button" : "img",
      tabIndex: v ? 0 : void 0,
      "aria-label": `${fe}${y ? "，实况链接准备中" : v ? `，${p === "press" ? "按住或按空格播放，Enter 切换" : "点击或按 Enter 播放"}` : ""}`,
      "aria-disabled": q || void 0,
      "aria-pressed": u.length > 0 ? P === "playing" : void 0,
      "aria-busy": I === "loading",
      onPointerDown: Te,
      onPointerUp: X,
      onPointerCancel: X,
      onLostPointerCapture: X,
      onPointerMove: (e) => {
        if (L.current !== e.pointerId) return;
        const r = e.currentTarget.getBoundingClientRect();
        (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) && t();
      },
      onPointerEnter: (e) => {
        p === "hover" && e.pointerType === "mouse" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && T();
      },
      onPointerLeave: () => {
        p === "hover" && t();
      },
      onClick: (e) => {
        if (v) {
          if (_.current && e.detail === 0) {
            _.current = !1;
            return;
          }
          _.current = !1, (p !== "press" || e.detail === 0) && ae();
        }
      },
      onKeyDown: Ee,
      onKeyUp: (e) => {
        e.key === " " && e.preventDefault(), D.current === e.key && t(), _.current = !1;
      },
      onBlur: t,
      onContextMenu: (e) => e.preventDefault(),
      onDragStart: (e) => e.preventDefault(),
      children: [
        /* @__PURE__ */ f(
          "img",
          {
            ref: ne,
            className: "live-photo__image",
            src: V,
            alt: "",
            "aria-hidden": "true",
            draggable: !1,
            decoding: "async",
            style: { objectFit: z },
            crossOrigin: Z,
            onError: (e) => {
              e.currentTarget === ne.current && M(new Error("照片加载失败，请检查图片地址或转换为 JPEG / WebP。"));
            }
          },
          V
        ),
        u.length > 0 && /* @__PURE__ */ f(
          "video",
          {
            ref: n,
            className: "live-photo__video",
            style: { objectFit: z },
            muted: U,
            loop: j,
            playsInline: !0,
            preload: pe,
            disablePictureInPicture: !0,
            disableRemotePlayback: !0,
            controlsList: "nodownload nofullscreen noremoteplayback",
            crossOrigin: Z,
            "aria-hidden": "true",
            tabIndex: -1,
            "webkit-playsinline": "true",
            "x5-playsinline": "true",
            onPlaying: (e) => {
              const r = e.currentTarget;
              if (r === n.current) {
                if (!i.current) {
                  r.pause();
                  return;
                }
                d(r) || ($(w), s("playing"), F());
              }
            },
            onWaiting: (e) => {
              e.currentTarget === n.current && i.current && s("loading");
            },
            onPause: (e) => {
              e.currentTarget === n.current && i.current && !e.currentTarget.ended && (a(), i.current = !1, h.current += 1, s("paused"));
            },
            onEnded: (e) => {
              e.currentTarget === n.current && t();
            },
            onLoadedMetadata: (e) => {
              const r = e.currentTarget;
              r === n.current && (d(r) || l(r));
            },
            onDurationChange: (e) => {
              e.currentTarget === n.current && l(e.currentTarget);
            },
            onSeeked: (e) => {
              const r = e.currentTarget;
              r === n.current && !d(r) && l(r);
            },
            onError: (e) => {
              e.currentTarget === n.current && M(new Error("视频加载或解码失败，请提供 H.264 MP4，或检查网络与跨域设置。"));
            },
            onTimeUpdate: (e) => {
              const r = e.currentTarget;
              r === n.current && (d(r) || l(r));
            },
            children: u.map((e, r) => /* @__PURE__ */ f(
              "source",
              {
                src: e.src,
                type: e.type,
                onError: (c) => {
                  c.currentTarget.parentElement === n.current && r === u.length - 1 && M(new Error("没有可播放的视频源，请检查地址或提供 H.264 MP4。"));
                }
              },
              e.src
            ))
          },
          w
        ),
        H != null && H !== !1 && /* @__PURE__ */ f(
          "span",
          {
            className: `live-photo__badge ${g?.className ?? ""}`.trim(),
            "data-position": g?.position ?? "top-left",
            style: { ...g?.style, ...Y ? g?.playingStyle : void 0 },
            "aria-hidden": "true",
            children: H
          }
        ),
        ve && /* @__PURE__ */ K("span", { className: "live-photo__hint", "aria-hidden": "true", children: [
          I === "loading" && /* @__PURE__ */ f("span", { className: "live-photo__spinner" }),
          Ce
        ] }),
        ce && /* @__PURE__ */ f("span", { className: "live-photo__error", role: "status", children: ce })
      ]
    }
  );
});
export {
  Re as LivePhoto
};
