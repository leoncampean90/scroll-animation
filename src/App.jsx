import { useEffect, useRef, useState } from 'react'
import {
  SiJavascript, SiTypescript, SiReact, SiVuedotjs, SiPhp, SiDotnet, SiSharp, SiPostgresql,
  SiGit, SiSubversion, SiGithub, SiGitlab
} from 'react-icons/si'
import { FaLinkedin } from 'react-icons/fa'
import './App.css'

const SEC1_FRAMES  = 195
const SEC2_FRAMES  = 232
const TOTAL_TO_LOAD = SEC1_FRAMES + SEC2_FRAMES
const SRC_W = 1920
const SRC_H = 1080

function pad(n) { return String(n).padStart(3, '0') }
function frame1Url(i) { return `/frames/ezgif-frame-${pad(i)}.jpg` }
function frame2Url(i) { return `/wire/ezgif-frame-${pad(i)}.jpg` }
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi) }
function fadeRange(p, inStart, inEnd, outStart, outEnd) {
  const fadeIn  = clamp((p - inStart) / (inEnd - inStart), 0, 1)
  const fadeOut = outStart != null ? clamp(1 - (p - outStart) / (outEnd - outStart), 0, 1) : 1
  return Math.min(fadeIn, fadeOut)
}

function setupCanvas(canvas, ctx) {
  if (!canvas || !ctx) return null
  const cssW   = canvas.offsetWidth  || window.innerWidth
  const cssH   = canvas.offsetHeight || window.innerHeight
  const rawDpr = window.devicePixelRatio || 1
  const dpr    = Math.min(rawDpr, SRC_W / cssW)
  const bw     = Math.round(cssW * dpr)
  const bh     = Math.round(cssH * dpr)
  const scale  = Math.min(bw / SRC_W, bh / SRC_H)
  const scaledW = Math.round(SRC_W * scale)
  const scaledH = Math.round(SRC_H * scale)
  const offsetX = Math.round((bw - scaledW) / 2)
  const offsetY = Math.round((bh - scaledH) / 2)
  const markW   = Math.round(bw * 0.2)
  const markH   = Math.round(scaledH * 0.12)
  canvas.width        = bw
  canvas.height       = bh
  canvas.style.width  = `${cssW}px`
  canvas.style.height = `${cssH}px`
  ctx.fillStyle = '#000'
  return { bw, bh, scaledW, scaledH, offsetX, offsetY, markW, markH }
}

export default function App() {
  const bitmaps1Ref = useRef(new Array(SEC1_FRAMES))
  const bitmaps2Ref = useRef(new Array(SEC2_FRAMES))

  // Section 1
  const canvas1Ref    = useRef(null)
  const ctx1Ref       = useRef(null)
  const container1Ref = useRef(null)
  const params1Ref    = useRef(null)
  const lastFrame1Ref = useRef(-1)
  const pending1Ref   = useRef(-1)
  const raf1Ref       = useRef(null)

  // Section 2
  const canvas2Ref    = useRef(null)
  const ctx2Ref       = useRef(null)
  const container2Ref = useRef(null)
  const params2Ref    = useRef(null)
  const lastFrame2Ref = useRef(-1)
  const pending2Ref   = useRef(-1)
  const raf2Ref       = useRef(null)
  const c2TopRef      = useRef(0)

  // Overlays
  const frontendRef  = useRef(null)
  const backendRef   = useRef(null)
  const fullstackRef = useRef(null)

  const [loaded, setLoaded]       = useState(0)
  const [allLoaded, setAllLoaded] = useState(false)

  // Load all frames from both sets
  useEffect(() => {
    let count = 0
    const isMobile = navigator.maxTouchPoints > 0 || window.innerWidth < 768

    function store(bitmaps, index, frame) {
      bitmaps.current[index] = frame
      setLoaded(++count)
      if (count === TOTAL_TO_LOAD) setAllLoaded(true)
    }

    function loadSet(total, urlFn, bitmaps) {
      for (let i = 1; i <= total; i++) {
        const img = new Image()
        const idx = i - 1
        img.src = urlFn(i)
        img.onload = () => {
          if (!isMobile && typeof createImageBitmap !== 'undefined') {
            createImageBitmap(img)
              .then(bm => store(bitmaps, idx, bm))
              .catch(() => store(bitmaps, idx, img))
          } else {
            store(bitmaps, idx, img)
          }
        }
        img.onerror = () => store(bitmaps, idx, null)
      }
    }

    loadSet(SEC1_FRAMES, frame1Url, bitmaps1Ref)
    loadSet(SEC2_FRAMES, frame2Url, bitmaps2Ref)
  }, [])

  function paintFrame(bitmaps, index, ctx, p) {
    const frame = bitmaps.current[index]
    if (!frame || !ctx || !p) return
    if (frame instanceof HTMLImageElement && !frame.complete) return
    ctx.drawImage(frame, p.offsetX, p.offsetY, p.scaledW, p.scaledH)
    ctx.fillRect(p.bw - p.markW, p.offsetY + p.scaledH - p.markH, p.markW, p.markH)
  }

  function updateOverlays(progress) {
    if (frontendRef.current)
      frontendRef.current.style.opacity  = fadeRange(progress, 0.02, 0.12, 0.38, 0.48)
    if (backendRef.current)
      backendRef.current.style.opacity   = fadeRange(progress, 0.38, 0.48, 0.72, 0.82)
    if (fullstackRef.current)
      fullstackRef.current.style.opacity = fadeRange(progress, 0.62, 0.72, null, null)
  }

  // Init canvases once all frames are ready
  useEffect(() => {
    if (!allLoaded) return

    ctx1Ref.current = canvas1Ref.current?.getContext('2d', { alpha: false })
    ctx2Ref.current = canvas2Ref.current?.getContext('2d', { alpha: false })

    params1Ref.current = setupCanvas(canvas1Ref.current, ctx1Ref.current)
    params2Ref.current = setupCanvas(canvas2Ref.current, ctx2Ref.current)

    paintFrame(bitmaps1Ref, 0, ctx1Ref.current, params1Ref.current)
    paintFrame(bitmaps2Ref, 0, ctx2Ref.current, params2Ref.current)
    updateOverlays(0)

    if (container2Ref.current) {
      c2TopRef.current = container2Ref.current.getBoundingClientRect().top + window.scrollY
    }

    const onResize = () => {
      params1Ref.current = setupCanvas(canvas1Ref.current, ctx1Ref.current)
      params2Ref.current = setupCanvas(canvas2Ref.current, ctx2Ref.current)
      paintFrame(bitmaps1Ref, Math.max(lastFrame1Ref.current, 0), ctx1Ref.current, params1Ref.current)
      paintFrame(bitmaps2Ref, Math.max(lastFrame2Ref.current, 0), ctx2Ref.current, params2Ref.current)
      if (container2Ref.current) {
        c2TopRef.current = container2Ref.current.getBoundingClientRect().top + window.scrollY
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [allLoaded])

  // Scroll handler
  useEffect(() => {
    if (!allLoaded) return

    function onScroll() {
      // ── Section 1 ──
      const c1 = container1Ref.current
      if (c1) {
        const p1  = clamp(window.scrollY / (c1.scrollHeight - window.innerHeight), 0, 1)
        const fi1 = Math.round(p1 * (SEC1_FRAMES - 1))
        updateOverlays(p1)
        if (fi1 !== lastFrame1Ref.current) {
          pending1Ref.current = fi1
          if (!raf1Ref.current) {
            raf1Ref.current = requestAnimationFrame(() => {
              raf1Ref.current = null
              const idx = pending1Ref.current
              if (idx !== lastFrame1Ref.current) {
                lastFrame1Ref.current = idx
                paintFrame(bitmaps1Ref, idx, ctx1Ref.current, params1Ref.current)
              }
            })
          }
        }
      }

      // ── Section 2 ──
      const c2 = container2Ref.current
      if (c2) {
        const rel = window.scrollY - c2TopRef.current
        const p2  = clamp(rel / (c2.scrollHeight - window.innerHeight), 0, 1)
        const fi2 = Math.round(p2 * (SEC2_FRAMES - 1))
        if (fi2 !== lastFrame2Ref.current) {
          pending2Ref.current = fi2
          if (!raf2Ref.current) {
            raf2Ref.current = requestAnimationFrame(() => {
              raf2Ref.current = null
              const idx = pending2Ref.current
              if (idx !== lastFrame2Ref.current) {
                lastFrame2Ref.current = idx
                paintFrame(bitmaps2Ref, idx, ctx2Ref.current, params2Ref.current)
              }
            })
          }
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf1Ref.current)
      cancelAnimationFrame(raf2Ref.current)
    }
  }, [allLoaded])

  const progress = Math.round((loaded / TOTAL_TO_LOAD) * 100)

  return (
    <>
      {!allLoaded && (
        <div className="loader">
          <div className="loader-track">
            <div className="loader-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="loader-text">{progress}%</p>
        </div>
      )}

      {/* ── Section 1: hexagon animation + resume ── */}
      <div ref={container1Ref} className="scroll-container">
        <div className="sticky-canvas">
          <canvas ref={canvas1Ref} className="frame-canvas" />

          <div ref={frontendRef} className="hex-label hex-label--left">
            <span className="hex-label__tag">01</span>
            <h3 className="hex-label__title">FRONTEND</h3>
            <p className="hex-label__sub">User Interface Layer</p>
          </div>

          <div ref={backendRef} className="hex-label hex-label--right">
            <span className="hex-label__tag">02</span>
            <h3 className="hex-label__title">BACKEND</h3>
            <p className="hex-label__sub">Server Logic Layer</p>
          </div>

          <div ref={fullstackRef} className="hex-label hex-label--center">
            <span className="hex-label__tag">03</span>
            <h3 className="hex-label__title">FULL STACK</h3>
            <p className="hex-label__sub">Web Application</p>
          </div>
        </div>

        <div className="scroll-space" aria-hidden="true" />

        <section className="resume">
          <div className="resume__scan-line" />

          <div className="resume__header">
            <div className="resume__title-block">
              <span className="resume__bracket">&lt;</span>
              <h1 className="resume__name">LEON CAMPEAN</h1>
              <span className="resume__bracket">/&gt;</span>
            </div>
            <p className="resume__role">Full Stack Developer</p>
            <p className="resume__bio">
              I turn coffee into code and problems into products. Five years in, I still
              get genuinely excited when something I built goes live — that feeling never
              gets old. I work across the full stack because I'm allergic to silos: I want
              to understand the whole system, own the whole story. I believe the best
              interfaces are the ones you don't notice, and the best APIs are the ones that
              feel obvious in hindsight. Outside the terminal, you'll find me deep in a game
              or obsessing over why some UI feels <span className="resume__highlight">alive</span> and
              others just… don't.
            </p>
            <div className="resume__traits">
              <span className="resume__trait">⬡ Curious by default</span>
              <span className="resume__trait">⬡ Ships, then iterates</span>
              <span className="resume__trait">⬡ Reads the docs</span>
              <span className="resume__trait">⬡ Makes it fast</span>
            </div>
            <div className="resume__status">
              <span className="resume__dot" />
              EVERY IDEA CAN BE TURNED INTO A PROJECT
            </div>
          </div>

          <div className="resume__divider" />

          <div className="resume__skills">
            <div className="resume__stack">
              <h2 className="resume__stack-title">
                <span className="resume__stack-num">01</span> FRONTEND
              </h2>
              <div className="resume__tech-grid">
                <TechCard icon={<SiJavascript />} name="JavaScript" color="#f7df1e" />
                <TechCard icon={<SiTypescript />} name="TypeScript" color="#3178c6" />
                <TechCard icon={<SiReact />}      name="React"      color="#61dafb" />
                <TechCard icon={<SiVuedotjs />}   name="Vue.js"     color="#42b883" />
                <TechCard icon={null}             name="ExtJS"      color="#00ff88" custom="EXT" />
              </div>
            </div>

            <div className="resume__stack-divider" />

            <div className="resume__stack">
              <h2 className="resume__stack-title">
                <span className="resume__stack-num">02</span> BACKEND
              </h2>
              <div className="resume__tech-grid">
                <TechCard icon={<SiPhp />}        name="PHP"        color="#8892be" />
                <TechCard icon={<SiDotnet />}     name=".NET"       color="#512bd4" />
                <TechCard icon={<SiSharp />}      name="C#"         color="#239120" />
                <TechCard icon={<SiPostgresql />} name="PostgreSQL" color="#4169e1" />
              </div>
            </div>
          </div>

          <div className="resume__divider" />

          <div className="resume__skills resume__skills--centered">
            <div className="resume__stack">
              <h2 className="resume__stack-title">
                <span className="resume__stack-num">03</span> VERSION CONTROL / CI-CD
              </h2>
              <div className="resume__tech-grid">
                <TechCard icon={<SiGit />}        name="Git"    color="#f05032" />
                <TechCard icon={<SiSubversion />} name="SVN"    color="#809cc9" />
                <TechCard icon={<SiGithub />}     name="GitHub" color="#fff" />
                <TechCard icon={<SiGitlab />}     name="GitLab" color="#fc6d26" />
              </div>
            </div>
          </div>

          <div className="resume__divider" />

          <div className="resume__footer">
            <span className="resume__footer-line">_build(frontend + backend) =&gt; FullStackApp</span>
          </div>
        </section>
      </div>

      {/* ── Let's Connect intro ── */}
      <section className="connect-intro">
        <div className="connect-intro__scan-line" />
        <span className="connect-intro__tag">04</span>
        <h2 className="connect-intro__title">
          <span className="connect-intro__bracket">&lt;</span>
          {' '}LET'S CONNECT{' '}
          <span className="connect-intro__bracket">/&gt;</span>
        </h2>
        <p className="connect-intro__sub">Have an idea? Let's build it together.</p>
        <div className="connect-intro__divider" />
      </section>

      {/* ── Section 2: connect animation ── */}
      <div ref={container2Ref} className="scroll-container">
        <div className="sticky-canvas">
          <canvas ref={canvas2Ref} className="frame-canvas" />
        </div>
        <div className="scroll-space scroll-space--connect" aria-hidden="true" />
      </div>

      {/* ── Social ── */}
      <section className="social">
        <div className="social__scan-line" />
        <div className="social__grid">
          <SocialCard
            icon={<FaLinkedin />}
            label="LinkedIn"
            handle="Leon Campean"
            href="https://www.linkedin.com/in/leon-campean-8439a1217/"
            color="#0a66c2"
          />
          <SocialCard
            icon={<SiGithub />}
            label="GitHub"
            handle="leoncampean90"
            href="https://github.com/leoncampean90"
            color="#ffffff"
          />
          <SocialCard
            icon={null}
            label="Email"
            handle="leoncampean90@gmail.com"
            href="mailto:leoncampean90@gmail.com"
            color="#00ff88"
            custom="@"
          />
        </div>
        <div className="social__footer">
          <span className="social__footer-line">_available(for_projects) =&gt; true</span>
        </div>
      </section>
    </>
  )
}

function TechCard({ icon, name, color, custom }) {
  return (
    <div className="tech-card" style={{ '--accent': color }}>
      <div className="tech-card__icon">
        {custom ? <span className="tech-card__custom">{custom}</span> : icon}
      </div>
      <span className="tech-card__name">{name}</span>
      <div className="tech-card__glow" />
    </div>
  )
}

function SocialCard({ icon, label, handle, href, color, custom }) {
  return (
    <a
      className="social-card"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ '--accent': color }}
    >
      <div className="social-card__icon">
        {custom ? <span className="social-card__custom">{custom}</span> : icon}
      </div>
      <span className="social-card__label">{label}</span>
      <span className="social-card__handle">{handle}</span>
      <div className="social-card__glow" />
    </a>
  )
}
