import { useEffect, useRef, useState } from 'react'
import {
  SiJavascript, SiTypescript, SiReact, SiVuedotjs, SiPhp, SiDotnet, SiSharp, SiPostgresql,
  SiGit, SiSubversion, SiGithub, SiGitlab
} from 'react-icons/si'
import './App.css'

const TOTAL_FRAMES = 195
const SRC_W = 1920
const SRC_H = 1080

function pad(n) { return String(n).padStart(3, '0') }
function frameUrl(i) { return `/frames/ezgif-frame-${pad(i)}.jpg` }
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi) }
function fadeRange(p, inStart, inEnd, outStart, outEnd) {
  const fadeIn  = clamp((p - inStart) / (inEnd - inStart), 0, 1)
  const fadeOut = outStart != null ? clamp(1 - (p - outStart) / (outEnd - outStart), 0, 1) : 1
  return Math.min(fadeIn, fadeOut)
}

export default function App() {
  const canvasRef     = useRef(null)
  const ctxRef        = useRef(null)
  const containerRef  = useRef(null)
  const bitmapsRef    = useRef(new Array(TOTAL_FRAMES))
  const paramsRef     = useRef(null)
  const lastFrameRef  = useRef(-1)
  const pendingRef    = useRef(-1)
  const rafRef        = useRef(null)

  const frontendRef   = useRef(null)
  const backendRef    = useRef(null)
  const fullstackRef  = useRef(null)

  const [loaded, setLoaded]       = useState(0)
  const [allLoaded, setAllLoaded] = useState(false)

  // Init canvas context once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    ctxRef.current = canvas.getContext('2d', { alpha: false })
  }, [])

  // Load frames — GPU bitmaps on desktop, raw img on mobile to avoid OOM
  useEffect(() => {
    let count = 0
    const isMobile = navigator.maxTouchPoints > 0 || window.innerWidth < 768

    function storeFrame(index, frame) {
      bitmapsRef.current[index] = frame
      setLoaded(++count)
      if (count === TOTAL_FRAMES) setAllLoaded(true)
    }

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = frameUrl(i)
      img.onload = () => {
        if (!isMobile && typeof createImageBitmap !== 'undefined') {
          createImageBitmap(img)
            .then(bm => storeFrame(i - 1, bm))
            .catch(() => storeFrame(i - 1, img))
        } else {
          storeFrame(i - 1, img)
        }
      }
      img.onerror = () => storeFrame(i - 1, null)
    }
  }, [])

  function computeParams() {
    const canvas = canvasRef.current
    const ctx    = ctxRef.current
    if (!canvas || !ctx) return

    // Cap DPR so we never render more pixels than the source frame provides
    const rawDpr = window.devicePixelRatio || 1
    const dpr    = Math.min(rawDpr, SRC_W / window.innerWidth)

    const bw      = Math.round(window.innerWidth  * dpr)
    const bh      = Math.round(window.innerHeight * dpr)
    const scale   = Math.max(bw / SRC_W, bh / SRC_H)
    const scaledW = Math.round(SRC_W * scale)
    const scaledH = Math.round(SRC_H * scale)
    const offsetX = Math.round((bw - scaledW) / 2)
    const offsetY = Math.round((bh - scaledH) / 2)
    const markW   = Math.round(bw * 0.2)
    const markH   = Math.round(scaledH * 0.12)

    canvas.width        = bw
    canvas.height       = bh
    canvas.style.width  = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
    ctx.fillStyle       = '#000'
    lastFrameRef.current = -1

    paramsRef.current = { bw, bh, scaledW, scaledH, offsetX, offsetY, markW, markH }
  }

  function drawFrame(index) {
    const frame = bitmapsRef.current[index]
    const ctx   = ctxRef.current
    const p     = paramsRef.current
    if (!frame || !ctx || !p) return
    // HTMLImageElement needs .complete check; ImageBitmap always ready
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

  useEffect(() => {
    if (!allLoaded) return
    computeParams()
    drawFrame(0)
    updateOverlays(0)

    const onResize = () => {
      computeParams()
      drawFrame(Math.max(lastFrameRef.current, 0))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [allLoaded])

  useEffect(() => {
    if (!allLoaded) return

    function onScroll() {
      const container = containerRef.current
      if (!container) return

      const progress   = clamp(window.scrollY / (container.scrollHeight - window.innerHeight), 0, 1)
      const frameIndex = Math.round(progress * (TOTAL_FRAMES - 1))

      updateOverlays(progress)

      if (frameIndex === lastFrameRef.current) return
      pendingRef.current = frameIndex

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const idx = pendingRef.current
          if (idx !== lastFrameRef.current) {
            lastFrameRef.current = idx
            drawFrame(idx)
          }
        })
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [allLoaded])

  const progress = Math.round((loaded / TOTAL_FRAMES) * 100)

  return (
    <div ref={containerRef} className="scroll-container">
      {!allLoaded && (
        <div className="loader">
          <div className="loader-track">
            <div className="loader-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="loader-text">{progress}%</p>
        </div>
      )}

      <div className="sticky-canvas">
        <canvas ref={canvasRef} className="frame-canvas" />

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
              <TechCard icon={<SiJavascript />}  name="JavaScript"  color="#f7df1e" />
              <TechCard icon={<SiTypescript />}  name="TypeScript"  color="#3178c6" />
              <TechCard icon={<SiReact />}       name="React"       color="#61dafb" />
              <TechCard icon={<SiVuedotjs />}    name="Vue.js"      color="#42b883" />
              <TechCard icon={null}              name="ExtJS"       color="#00ff88" custom="EXT" />
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
              <TechCard icon={<SiGit />}        name="Git"        color="#f05032" />
              <TechCard icon={<SiSubversion />} name="SVN"        color="#809cc9" />
              <TechCard icon={<SiGithub />}     name="GitHub"     color="#fff" />
              <TechCard icon={<SiGitlab />}     name="GitLab"     color="#fc6d26" />
            </div>
          </div>
        </div>

        <div className="resume__divider" />

        <div className="resume__footer">
          <span className="resume__footer-line">_build(frontend + backend) =&gt; FullStackApp</span>
        </div>
      </section>
    </div>
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
