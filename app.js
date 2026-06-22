/* ===================================================================
   ELT, Seed to Auction. Clean-slate motion layer.
   Built from scratch around GSAP + ScrollTrigger + SplitText + Lenis + Splide.
   Mobile-first. Content is visible at rest; animation only enhances.
   =================================================================== */
(function () {
  "use strict";

  var hasGSAP = typeof gsap !== "undefined";
  var hasST = typeof ScrollTrigger !== "undefined";
  var hasSplit = typeof SplitText !== "undefined";
  var hasLenis = typeof Lenis !== "undefined";
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var isDesktop = window.matchMedia("(min-width: 768px)").matches;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (hasGSAP && hasST) gsap.registerPlugin(ScrollTrigger);
  if (hasGSAP && hasSplit) gsap.registerPlugin(SplitText);

  /* ---------------- asset path builders ---------------- */
  function pad(n) { return ("0000" + n).slice(-4); }
  function scrollFrames(total) {
    var a = [];
    for (var i = 0; i < total; i++) a.push("assets/frames/scroll/f" + pad(i) + ".avif");
    return a;
  }
  function plantFrames(total) {
    var a = [];
    for (var i = 0; i < total; i++) a.push("assets/frames/plant/f" + pad(i) + ".avif");
    return a;
  }

  /* PRELOADER mark is now a type-set ELT wordmark in the markup (no injected
     image); the clean fade-in is handled in runPreloader + CSS. */

  /* ====================================================================
     LENIS smooth scroll, synced to GSAP ticker (single RAF source)
     ==================================================================== */
  /* NATIVE scroll only. The reference uses Lenis smooth-wheel, but a wheel
     hijack fights the sticky-pinned sections (the hero cover-reveal + the scrub
     canvas) and janks (doctrine + fixes.json wheel-hijack-jank). Native scroll
     with scroll-behavior:smooth + scroll-padding-top gives the same anchor feel
     without the jank, and ScrollTrigger reads the document scroller directly. */
  var lenis = null;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  function lockScroll() { document.documentElement.classList.add("scroll-locked"); }
  function unlockScroll() { document.documentElement.classList.remove("scroll-locked"); }

  /* anchor links: native smooth scroll (scroll-padding-top offsets the header) */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id === "#") return;
      if (id === "#top") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); closeMenu(); return; }
      var el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
        closeMenu();
      }
    });
  });

  /* ====================================================================
     SPLITTEXT reveal. Content is visible at rest; we only animate when
     SplitText is available, and always guarantee final visibility.
     ==================================================================== */
  function setupSplitReveals() {
    if (!hasGSAP || !hasST || !hasSplit || reduceMotion) return;
    document.querySelectorAll("[text-split]").forEach(function (el) {
      // keep a clean copy in case we revert
      var split;
      try { split = new SplitText(el, { type: "chars,words,lines" }); }
      catch (err) { return; }
      // Build the random-scatter reveal as a paused timeline. Chars start
      // invisible AND dropped/blurred so the scatter is genuinely visible,
      // not a faint cross-fade.
      var tl = gsap.timeline({ paused: true });
      gsap.set(split.chars, { autoAlpha: 0, yPercent: 60, rotateZ: function () { return gsap.utils.random(-14, 14); }, filter: "blur(6px)" });
      tl.to(split.chars, {
        autoAlpha: 1, yPercent: 0, rotateZ: 0, filter: "blur(0px)",
        duration: 0.62, ease: "power3.out",
        stagger: { each: 0.022, from: "random" }
      });
      el._splitInstance = split;
      el._splitTimeline = tl;

      // The ScrollTrigger IS the reveal driver. onEnter plays it the moment the
      // heading scrolls into view; onLeaveBack rewinds so it replays on the way
      // back up. No blind global timer, so nothing below the fold pre-reveals.
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        onEnter: function () { tl.play(); },
        onLeaveBack: function () { tl.pause(0); }
      });

      // Safety net for headings ALREADY in view at load (e.g. the hero): play
      // the reveal, and if the animation-frame loop is throttled/stalled so the
      // timeline hasn't finished shortly after, force it to its end-state so the
      // hero text is never left ghosted. Below-fold headings are untouched here.
      requestAnimationFrame(function () {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          tl.play();
          setTimeout(function () { if (tl.progress() < 1) tl.progress(1); }, 1500);
        }
      });
    });
    // Absolute last-resort net: anything whose trigger has passed but never
    // revealed gets snapped to its end-state. Short timeout so text never
    // lingers hidden in a degraded environment.
    setTimeout(function () {
      document.querySelectorAll("[text-split]").forEach(function (el) {
        var tl = el._splitTimeline;
        if (!tl) return;
        var r = el.getBoundingClientRect();
        var passedTop = r.bottom < window.innerHeight;
        if (passedTop && tl.progress() < 1) tl.progress(1);
      });
    }, 4000);
  }

  /* generic data-reveal: visible rise + soft scale, plays on enter, rewinds on
     leave-back so it actually replays during a scroll up/down (testable). */
  function setupDataReveals() {
    if (!hasGSAP || !hasST || reduceMotion) return;
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el,
        { y: 42, autoAlpha: 0, scale: 0.985 },
        {
          y: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", toggleActions: "play none none reverse" }
        });
    });
  }

  /* transition lines: draw on enter, retract on leave-back */
  function setupLines() {
    if (!hasGSAP || !hasST) return;
    document.querySelectorAll("[data-line]").forEach(function (el) {
      ScrollTrigger.create({
        trigger: el, start: "top 85%",
        onEnter: function () { el.classList.add("active"); },
        onLeaveBack: function () { el.classList.remove("active"); }
      });
    });
  }

  /* ====================================================================
     HEADER color-flip (cream over dark sections, ink over light sections)
     ==================================================================== */
  function setupHeaderFlip() {
    var LIGHT = "#F4EDE6", DARK = "#404F1D";
    var nav = document.getElementById("nav");
    if (!nav) return;
    // dark-ink sections: pages with a light/cream background. Home uses explicit
    // IDs; inner pages tag their cream/beige bands with .band-cream/.band-beige,
    // so the same flip works everywhere without per-page wiring.
    var lightBgIds = ["#s-texts-animation", "#s-carbon", "#s-trials", "#s-team", "#s-products"];
    var sections = lightBgIds.map(function (s) { return document.querySelector(s); }).filter(Boolean);
    sections = sections.concat([].slice.call(document.querySelectorAll(".band-cream, .band-beige")));
    function overlaps(sec, r) { var b = sec.getBoundingClientRect(); return b.top <= r.bottom && b.bottom > r.top; }
    function apply(color) {
      nav.style.color = color;
    }
    var ticking = false;
    function evaluate() {
      var r = nav.getBoundingClientRect();
      var onLight = sections.some(function (s) { return overlaps(s, r); });
      apply(onLight ? DARK : LIGHT);
      // when nav sits on a light/cream section, the logo scrim is not needed
      nav.classList.toggle("on-light", onLight);
      ticking = false;
    }
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(evaluate); }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    evaluate();
  }

  /* ====================================================================
     CONTINUOUS ANIMATED GREEN GROUND (one fixed layer behind the whole page).
     Paper Design "Warp" WebGL2 shader (catalog: animated-gradient), ported
     to plain JS from design/components/animated-gradient and ELT-skinned to a
     warm gold/green mood. It lives in the fixed #ground layer so every
     transparent green section reveals the SAME living surface; cream sections
     cover it. Falls back to the static .ground-fallback gradient (and the deep
     -ink html base) if WebGL2 is unavailable or motion is reduced.
     ==================================================================== */
  function setupHeroGradient() {
    var canvas = document.getElementById("hero-gradient");
    if (!canvas) return;
    if (reduceMotion) return; // static fallback stays
    var gl = canvas.getContext("webgl2");
    if (!gl) return; // WebGL2 unavailable -> fallback stays

    // ---- GLSL, verbatim from the catalog export ----
    var VERT =
      "#version 300 es\n" +
      "layout(location = 0) in vec4 a_position;\n" +
      "void main() { gl_Position = a_position; }\n";
    var FRAG =
      "#version 300 es\n" +
      "precision highp float;\n" +
      "uniform float u_time; uniform float u_pixelRatio; uniform vec2 u_resolution;\n" +
      "uniform float u_scale; uniform float u_rotation;\n" +
      "uniform vec4 u_color1; uniform vec4 u_color2; uniform vec4 u_color3;\n" +
      "uniform float u_proportion; uniform float u_softness; uniform float u_shape;\n" +
      "uniform float u_shapeScale; uniform float u_distortion; uniform float u_swirl;\n" +
      "uniform float u_swirlIterations;\n" +
      "out vec4 fragColor;\n" +
      "#define TWO_PI 6.28318530718\n" +
      "#define PI 3.14159265358979323846\n" +
      "vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }\n" +
      "float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }\n" +
      "float noise(vec2 st) {\n" +
      "  vec2 i = floor(st); vec2 f = fract(st);\n" +
      "  float a = random(i); float b = random(i + vec2(1.0, 0.0));\n" +
      "  float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));\n" +
      "  vec2 u = f * f * (3.0 - 2.0 * f);\n" +
      "  float x1 = mix(a, b, u.x); float x2 = mix(c, d, u.x);\n" +
      "  return mix(x1, x2, u.y);\n" +
      "}\n" +
      "vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {\n" +
      "    vec3 color1 = c1.rgb * c1.a; vec3 color2 = c2.rgb * c2.a; vec3 color3 = c3.rgb * c3.a;\n" +
      "    float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);\n" +
      "    float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);\n" +
      "    vec3 blended_color_2 = mix(color1, color2, r1);\n" +
      "    float blended_opacity_2 = mix(c1.a, c2.a, r1);\n" +
      "    vec3 c = mix(blended_color_2, color3, r2);\n" +
      "    float o = mix(blended_opacity_2, c3.a, r2);\n" +
      "    return vec4(c, o);\n" +
      "}\n" +
      "void main() {\n" +
      "    vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n" +
      "    float t = .5 * u_time;\n" +
      "    float noise_scale = .0005 + .006 * u_scale;\n" +
      "    uv -= .5; uv *= (noise_scale * u_resolution);\n" +
      "    uv = rotate(uv, u_rotation * .5 * PI);\n" +
      "    uv /= u_pixelRatio; uv += .5;\n" +
      "    float n1 = noise(uv * 1. + t); float n2 = noise(uv * 2. - t);\n" +
      "    float angle = n1 * TWO_PI;\n" +
      "    uv.x += 4. * u_distortion * n2 * cos(angle);\n" +
      "    uv.y += 4. * u_distortion * n2 * sin(angle);\n" +
      "    float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));\n" +
      "    for (float i = 1.; i <= iterations_number; i++) {\n" +
      "        uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);\n" +
      "        uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);\n" +
      "    }\n" +
      "    float proportion = clamp(u_proportion, 0., 1.);\n" +
      "    float shape = 0.; float mixer = 0.;\n" +
      "    if (u_shape < .5) {\n" +
      "      vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);\n" +
      "      shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);\n" +
      "      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);\n" +
      "    } else if (u_shape < 1.5) {\n" +
      "      vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);\n" +
      "      float f = fract(stripes_shape_uv.y);\n" +
      "      shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);\n" +
      "      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);\n" +
      "    } else {\n" +
      "      float sh = 1. - uv.y; sh -= .5; sh /= (noise_scale * u_resolution.y); sh += .5;\n" +
      "      float shape_scaling = .2 * (1. - u_shapeScale);\n" +
      "      shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));\n" +
      "      mixer = shape;\n" +
      "    }\n" +
      "    vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);\n" +
      "    fragColor = vec4(color_mix.rgb, color_mix.a);\n" +
      "}\n";

    function hexToVec4(hex) {
      hex = hex.replace(/^#/, "");
      if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
      return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1];
    }
    function compile(type, src) {
      var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error("hero-gradient shader: " + gl.getShaderInfoLog(sh)); gl.deleteShader(sh); return null; }
      return sh;
    }
    var v = compile(gl.VERTEX_SHADER, VERT), f = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!v || !f) return;
    var prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error("hero-gradient link: " + gl.getProgramInfoLog(prog)); return; }

    var loc = gl.getAttribLocation(prog, "a_position");
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // ELT skin: deep-green base -> warm gold accent -> mid leaf-green.
    // Tuned subtle + premium (low distortion, slow drift, soft edges).
    var color1 = "#1F2509", color2 = "#C8A23C", color3 = "#3a4718";
    var params = {
      u_scale: 0.62,
      u_rotation: (40 * Math.PI) / 180,
      u_color1: hexToVec4(color1), u_color2: hexToVec4(color2), u_color3: hexToVec4(color3),
      u_proportion: 0.34, u_distortion: 0.10, u_swirl: 0.62, u_swirlIterations: 8,
      u_softness: 1.0, u_shapeScale: 0.46, u_shape: 2 /* Edge */
    };
    // speed via the same cubicBezier(0.65,0,0.88,0.77)*5 off a low value for a calm drift.
    var speed = 0.55;

    var U = {};
    ["u_time", "u_pixelRatio", "u_resolution"].concat(Object.keys(params)).forEach(function (k) {
      U[k] = gl.getUniformLocation(prog, k);
    });
    gl.useProgram(prog);
    Object.keys(params).forEach(function (k) {
      var val = params[k];
      if (Array.isArray(val)) gl.uniform4fv(U[k], val);
      else gl.uniform1f(U[k], val);
    });

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.useProgram(prog);
        gl.uniform2f(U.u_resolution, w, h);
        gl.uniform1f(U.u_pixelRatio, dpr);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    var total = 0, lastT = performance.now(), running = true, raf = null, live = false;
    function frame(now) {
      if (!running) { raf = null; return; }
      var dt = now - lastT; lastT = now;
      total += dt * speed;
      gl.useProgram(prog);
      gl.uniform1f(U.u_time, total * 1e-3);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!live) { live = true; canvas.classList.add("is-live"); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // pause when the hero scrolls offscreen (optimisation only). Never pauses
    // until the gradient has gone live, so it can't suppress the first paint.
    var io = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible) {
        if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
      } else if (live) {
        running = false;
      }
    }, { threshold: 0 });
    io.observe(canvas);
  }

  /* ====================================================================
     1. HERO cursor-trail (desktop, pointer only). Pure flourish.
     ==================================================================== */
  function setupTrail() {
    var canvas = document.getElementById("trail-canvas");
    var section = document.getElementById("trail-section");
    if (!canvas || !section || isTouch || !isDesktop || reduceMotion) return;
    canvas.style.display = "block";
    var ctx = canvas.getContext("2d");
    var SQUARE = 5;
    var FADE_IN = 100, FADE_OUT = 300;
    var stops = [
      { p: 0, c: [212, 222, 114] },
      { p: 0.43, c: [136, 158, 57] },
      { p: 0.97, c: [49, 61, 26] }
    ];
    var cols, rows, grid, dpr;
    function lerpColor(t) {
      for (var i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].p && t <= stops[i + 1].p) {
          var span = stops[i + 1].p - stops[i].p || 1;
          var k = (t - stops[i].p) / span;
          var a = stops[i].c, b = stops[i + 1].c;
          return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
        }
      }
      return stops[stops.length - 1].c;
    }
    function size() {
      dpr = window.devicePixelRatio || 1;
      var w = section.clientWidth, h = section.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / SQUARE); rows = Math.ceil(h / SQUARE);
      grid = new Float32Array(cols * rows); // opacity per cell
    }
    size();
    window.addEventListener("resize", size);
    var active = true;
    section.addEventListener("pointermove", function (e) {
      if (!active) return;
      var rect = section.getBoundingClientRect();
      var cx = Math.floor((e.clientX - rect.left) / SQUARE);
      var cy = Math.floor((e.clientY - rect.top) / SQUARE);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
      grid[cy * cols + cx] = 1;
    });
    var last = performance.now();
    function loop(now) {
      var dt = now - last; last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var fadeStep = dt / FADE_OUT;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var idx = y * cols + x;
          var o = grid[idx];
          if (o <= 0) continue;
          o -= fadeStep; if (o < 0) o = 0;
          grid[idx] = o;
          var col = lerpColor(cols > 1 ? x / (cols - 1) : 0);
          ctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (o * 0.85) + ")";
          ctx.fillRect(x * SQUARE, y * SQUARE, SQUARE - 1, SQUARE - 1);
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    // disable once we scroll past the hero
    if (hasST) {
      var trigger = document.getElementById("s-texts-animation");
      if (trigger) ScrollTrigger.create({ trigger: trigger, start: "top bottom", onEnter: function () { active = false; }, onLeaveBack: function () { active = true; } });
    }
  }

  /* ====================================================================
     1b. HERO -> first-section COVER REVEAL (the real reference handoff).
     The cover itself is pure CSS: #trail-section is sticky/pinned and the
     opaque #s-texts-animation below it sits one z-index higher, so as you
     scroll it rises up and DEALS OVER the held hero from the bottom edge.
     The only JS is: once the cover fully occludes the hero, hide the hero so
     it can never bleed through the transparent green bands lower down; show
     it again on the way back up. The toggle fires exactly at full occlusion,
     so it is seamless.
     ==================================================================== */
  function setupHeroTransition() {
    if (!hasGSAP || !hasST) return;
    var hero = document.getElementById("trail-section");
    var cover = document.getElementById("s-texts-animation");
    if (!hero || !cover) return;
    ScrollTrigger.create({
      trigger: cover,
      start: "top top",        // cover fully fills the viewport = hero fully occluded
      onEnter: function () { hero.classList.add("is-covered"); },
      onLeaveBack: function () { hero.classList.remove("is-covered"); }
    });
  }

  /* ====================================================================
     3. CAPSULE scroll-scrubbed canvas (desktop scrub; mobile static frame)
     ==================================================================== */
  function setupScrollCanvas() {
    var canvas = document.getElementById("scroll-canvas");
    var capsule = document.querySelector(".capsule");
    if (!canvas || !capsule) return;
    var ctx = canvas.getContext("2d");
    // Real Pexels farmer-field footage (id 3065488) extracted to 117 AVIF frames
    // (assets/frames/field). Scroll scrubs the clip (Pipeline B). Mobile loads
    // one frame, no scrub.
    var urls = []; for (var vi = 0; vi < 117; vi++) urls.push("assets/frames/field/f" + pad(vi) + ".avif");
    var total = urls.length;
    var images = new Array(total);
    var frameObj = { frame: 0 };
    var dpr = window.devicePixelRatio || 1;

    function setSize() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(i) {
      var img = images[i];
      if (!img) return;
      var cw = canvas.width / dpr, ch = canvas.height / dpr;
      var scale = Math.max(cw / img.width, ch / img.height);
      var x = (cw - img.width * scale) / 2;
      var y = (ch - img.height * scale) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }
    setSize();
    window.addEventListener("resize", function () { setSize(); draw(Math.round(frameObj.frame)); });

    // Only reduced-motion users get a static frame; everyone else (mobile AND
    // desktop) gets the scroll-scrub. Frames are kept light for mobile data.
    if (reduceMotion) {
      var mid = Math.floor(total / 2);
      var im = new Image();
      im.onload = function () { images[mid] = im; canvas.style.opacity = "1"; frameObj.frame = mid; draw(mid); };
      im.onerror = function () { /* fallback bg stays visible */ };
      im.src = urls[mid];
      return;
    }

    // desktop: preload all then scrub
    var loaded = 0, failed = 0;
    urls.forEach(function (url, i) {
      var img = new Image();
      img.onload = function () { images[i] = img; loaded++; ready(); };
      img.onerror = function () { failed++; ready(); };
      img.src = url;
    });
    var started = false;
    function ready() {
      if (started) return;
      if (loaded + failed >= total) start();
    }
    // failsafe: start scrubbing as soon as a handful of frames are in, so it
    // never sits blank waiting on the full preload (draws nearest-loaded).
    setTimeout(function () { if (!started && loaded > 4) start(); }, 2200);

    function start() {
      started = true;
      canvas.style.opacity = "1";
      // find first loaded frame to draw
      var f0 = 0; while (f0 < total && !images[f0]) f0++;
      draw(f0);
      if (!hasGSAP || !hasST) return;
      gsap.to(frameObj, {
        frame: total - 1, ease: "none",
        scrollTrigger: { trigger: capsule, start: "top top", end: "bottom bottom", scrub: 1 },
        onUpdate: function () {
          var i = Math.round(frameObj.frame);
          if (!images[i]) { // snap to nearest loaded
            var j = i; while (j > 0 && !images[j]) j--;
            i = j;
          }
          draw(i);
        }
      });
      if (hasST) ScrollTrigger.refresh();
    }
  }

  /* ====================================================================
     8. PLANT click-to-grow canvas
     ==================================================================== */
  function setupPlantCanvas() {
    var canvas = document.getElementById("plant-canvas");
    var growBtn = document.getElementById("grow-button");
    var heading = document.getElementById("soon-heading");
    var description = document.getElementById("soon-description");
    var dropBox = document.querySelector(".drop-icon-hide-box");
    if (!canvas || !growBtn) return;
    var ctx = canvas.getContext("2d");
    var urls = plantFrames(120);
    var total = urls.length;
    var images = new Array(total);
    var current = 0;
    var clickCount = 0;
    var FRAMES_PER_CLICK = 30;
    var TWEEN_DURATION = 1.25;
    var DROP_START_EM = 1.7;
    var TOTAL_CLICKS = Math.ceil((total - 1) / FRAMES_PER_CLICK);
    var dpr = window.devicePixelRatio || 1;

    function setSize() {
      dpr = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(i) {
      var img = images[i];
      if (!img) return;
      var cw = canvas.width / dpr, ch = canvas.height / dpr;
      var scale = Math.max(cw / img.width, ch / img.height);
      var x = (cw - img.width * scale) / 2;
      var y = (ch - img.height * scale) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }
    setSize();
    window.addEventListener("resize", function () { setSize(); draw(current); });

    function setDisabled(state) {
      growBtn.classList.toggle("is-disabled", state);
      growBtn.setAttribute("aria-disabled", state ? "true" : "false");
    }
    function updateDrop() {
      if (!dropBox) return;
      var progress = Math.min(clickCount / TOTAL_CLICKS, 1);
      dropBox.style.height = (DROP_START_EM * (1 - progress)) + "em";
    }
    setDisabled(true);

    var loaded = 0, failed = 0, started = false;
    urls.forEach(function (url, i) {
      var img = new Image();
      img.onload = function () { images[i] = img; loaded++; ready(); };
      img.onerror = function () { failed++; ready(); };
      img.src = url;
    });
    function ready() { if (!started && loaded + failed >= total) begin(); }
    setTimeout(function () { if (!started && loaded > 5) begin(); }, 6000);
    function begin() {
      started = true;
      var f0 = 0; while (f0 < total && !images[f0]) f0++;
      current = f0; draw(f0);
      setDisabled(false);
      updateDrop();
    }

    var finalDone = false;
    growBtn.addEventListener("click", function () {
      if (growBtn.classList.contains("is-disabled") || finalDone) return;
      var nextFrame = Math.min(current + FRAMES_PER_CLICK, total - 1);
      setDisabled(true);
      clickCount = Math.min(clickCount + 1, TOTAL_CLICKS);
      updateDrop();
      if (!hasGSAP) {
        // no GSAP: jump
        current = nextFrame; draw(current);
        if (nextFrame >= total - 1) { playFinal(); setDisabled(true); } else setDisabled(false);
        return;
      }
      gsap.to({ f: current }, {
        f: nextFrame, duration: TWEEN_DURATION, ease: "none",
        onUpdate: function () {
          current = Math.round(this.targets()[0].f);
          // draw nearest loaded
          var i = current; if (!images[i]) { var j = i; while (j > 0 && !images[j]) j--; i = j; }
          draw(i);
        },
        onComplete: function () {
          if (nextFrame >= total - 1) { playFinal(); setDisabled(true); }
          else setDisabled(false);
        }
      });
    });

    function playFinal() {
      finalDone = true;
      if (description && hasGSAP) gsap.to(description, { opacity: 0, duration: 0.8, ease: "power2.out" });
      if (!heading) return;
      var FINAL = "Now it sells at the floor.";
      if (hasGSAP && hasSplit && heading._splitTimeline && heading._splitInstance) {
        var split = heading._splitInstance;
        var tl = heading._splitTimeline;
        tl.reverse();
        tl.eventCallback("onReverseComplete", function () {
          split.revert();
          heading.textContent = FINAL;
          var ns;
          try { ns = new SplitText(heading, { type: "chars,words,lines" }); }
          catch (e) { heading.style.opacity = 1; return; }
          gsap.set(ns.chars, { autoAlpha: 0 });
          gsap.to(ns.chars, { autoAlpha: 1, duration: 0.4, ease: "power2.out", stagger: { each: 0.02, from: "random" } });
        });
      } else {
        heading.textContent = FINAL;
      }
    }
  }

  /* ====================================================================
     9. PRODUCTS Splide carousel + icon glow (desktop hover)
     ==================================================================== */
  function setupProducts() {
    var el = document.getElementById("products-splide");
    if (!el || typeof Splide === "undefined") return;
    var splide = new Splide(el, {
      perPage: 2, perMove: 1, focus: "left", type: "slide", gap: "1em",
      arrows: true, pagination: false, speed: 1000, dragAngleThreshold: 30,
      autoWidth: false, rewind: false, waitForTransition: false, updateOnMove: true, trimSpace: false,
      breakpoints: { 991: { autoWidth: true }, 767: { autoWidth: true, perPage: 1 }, 479: { autoWidth: true, perPage: 1 } }
    });
    splide.mount();
  }
  function setupIconGlow() {
    if (isTouch || !isDesktop) return;
    document.querySelectorAll(".product-card .icon-mask").forEach(function (icon) {
      var card = icon.closest(".product-card");
      var target = card || icon;
      target.addEventListener("pointerenter", function () { icon.style.setProperty("--glow-opacity", "0.9"); });
      target.addEventListener("pointerleave", function () { icon.style.setProperty("--glow-opacity", "0"); });
      target.addEventListener("pointermove", function (e) {
        var r = icon.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width) * 100;
        var y = ((e.clientY - r.top) / r.height) * 100;
        icon.style.setProperty("--cursor-x", x + "%");
        icon.style.setProperty("--cursor-y", y + "%");
      });
    });
  }

  /* ====================================================================
     VALUE CARDS 3d-parallax tilt + glare sheen (ported from card-pickboard's
     CardParallax). Pointer tilt and a moving glare are the only real effects;
     no chip, no outline, no pill. Desktop pointer only; cards read at rest.
     ==================================================================== */
  function setupTiltCards() {
    if (isTouch || !isDesktop || reduceMotion) return;
    var TILT = 9;
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      var glare = card.querySelector(".vcard-glare");
      card.addEventListener("pointerenter", function () {
        card.style.setProperty("--glare", "1");
        card.style.boxShadow = "0 " + (20 + TILT) + "px " + (40 + TILT * 2) + "px rgba(0,0,0,0.45)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--glare", "0");
        card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.30)";
      });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var py = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        card.style.setProperty("--rx", (py * TILT).toFixed(2) + "deg");
        card.style.setProperty("--ry", (-px * TILT).toFixed(2) + "deg");
        if (glare) {
          card.style.setProperty("--gx", ((px + 1) * 50).toFixed(1) + "%");
          card.style.setProperty("--gy", ((py + 1) * 50).toFixed(1) + "%");
        }
      });
    });
  }

  /* ====================================================================
     FEATURE FLIPPER (catalog #113): click a panel to expand it, siblings
     collapse. One panel is always active. Pure class toggle; the width tween
     and description reveal are CSS. Works on real taps + clicks (mobile + desktop).
     ==================================================================== */
  function setupFlipper() {
    document.querySelectorAll("[data-flipper]").forEach(function (flipper) {
      var cards = [].slice.call(flipper.querySelectorAll("[data-flip]"));
      if (!cards.length) return;
      if (!cards.some(function (c) { return c.classList.contains("is-active"); })) cards[0].classList.add("is-active");
      cards.forEach(function (card) {
        card.addEventListener("click", function () {
          if (card.classList.contains("is-active")) return;
          cards.forEach(function (c) { c.classList.remove("is-active"); });
          card.classList.add("is-active");
        });
      });
    });
  }

  /* ====================================================================
     REGION map pins (desktop) + tap list (mobile)
     ==================================================================== */
  function setupRegions() {
    document.querySelectorAll("[data-region]").forEach(function (pin) {
      pin.addEventListener("click", function () {
        var wasActive = pin.classList.contains("active");
        document.querySelectorAll("[data-region]").forEach(function (p) { p.classList.remove("active"); });
        if (!wasActive) pin.classList.add("active");
      });
      // desktop hover convenience
      if (!isTouch) {
        pin.addEventListener("pointerenter", function () { pin.classList.add("active"); });
        pin.addEventListener("pointerleave", function () { pin.classList.remove("active"); });
      }
    });
    document.querySelectorAll("[data-region-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".region-item");
        var open = item.classList.contains("open");
        document.querySelectorAll(".region-item").forEach(function (i) { i.classList.remove("open"); i.querySelector(".ri-toggle").textContent = "+"; });
        if (!open) { item.classList.add("open"); btn.querySelector(".ri-toggle").textContent = "+"; }
      });
    });
  }

  /* ====================================================================
     MENU side-bar + accordion
     ==================================================================== */
  var menu = document.getElementById("menu-side-bar");
  function openMenu() { if (!menu) return; menu.classList.add("open"); menu.setAttribute("aria-hidden", "false"); lockScroll(); }
  function closeMenu() { if (!menu) return; menu.classList.remove("open"); menu.setAttribute("aria-hidden", "true"); if (!apply || !apply.classList.contains("open")) unlockScroll(); }
  function setupMenu() {
    var openBtn = document.getElementById("menu-open");
    var closeBtn = document.getElementById("menu-close");
    if (openBtn) openBtn.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    document.querySelectorAll("[data-menu-group]").forEach(function (btn) {
      btn.addEventListener("click", function () { btn.closest(".menu-group").classList.toggle("open"); });
    });
    document.querySelectorAll("[data-menu-link]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var href = btn.getAttribute("data-href");
        closeMenu();
        var el = href && document.querySelector(href);
        if (el) { setTimeout(function () { if (lenis) lenis.scrollTo(el, { offset: -10 }); else el.scrollIntoView({ behavior: "smooth" }); }, 200); }
      });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeApply(); } });
  }

  /* ====================================================================
     APPLY form modal
     ==================================================================== */
  var apply = document.getElementById("apply-form");
  function openApply() { if (!apply) return; apply.classList.add("open"); apply.setAttribute("aria-hidden", "false"); lockScroll(); }
  function closeApply() { if (!apply) return; apply.classList.remove("open"); apply.setAttribute("aria-hidden", "true"); if (!menu || !menu.classList.contains("open")) unlockScroll(); }
  function setupApply() {
    document.querySelectorAll("[data-apply]").forEach(function (btn) {
      btn.addEventListener("click", function (e) { e.preventDefault(); closeMenu(); openApply(); });
    });
    var closeBtn = document.getElementById("apply-close");
    if (closeBtn) closeBtn.addEventListener("click", closeApply);
    if (apply) apply.addEventListener("click", function (e) { if (e.target === apply) closeApply(); });
    var form = document.getElementById("elt-form");
    var ok = document.getElementById("apply-success");
    var err = document.getElementById("apply-error");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (ok) ok.classList.remove("success");
        if (err) err.classList.remove("error");
        var name = form.querySelector('[name="fullname"]');
        var phone = form.querySelector('[name="phone"]');
        if (!name.value.trim() || !phone.value.trim()) {
          if (err) { err.textContent = "Please add your name and phone so we can reach you."; err.classList.add("error"); }
          return;
        }
        // no backend in this demo build; show success
        form.querySelectorAll("input, select, button").forEach(function (f) { f.setAttribute("disabled", "true"); });
        if (ok) ok.classList.add("success");
      });
    }
  }

  /* ====================================================================
     PRELOADER: layered reveal, gated on DOM + a short timer, with failsafe
     ==================================================================== */
  function runPreloader() {
    var pre = document.getElementById("preloader");
    var bar = document.getElementById("pl-bar");
    if (!pre) { unlockScroll(); return; }
    lockScroll();
    var done = false;
    function finish() {
      if (done) return; done = true;
      pre.classList.add("is-done");
      setTimeout(function () {
        pre.style.display = "none";
        pre.style.pointerEvents = "none";
        unlockScroll();
        if (hasST) ScrollTrigger.refresh();
      }, 750);
    }
    // The intro (wordmark fade-in + gold line fill) is pure CSS, playing on
    // render. JS only fades the panel out on a fixed timer once the intro has
    // played, so there is no animation-completion event to miss.
    var hold = reduceMotion ? 500 : 1600;
    setTimeout(finish, hold);
    setTimeout(finish, 4000); // hard safety; the `done` guard makes it a no-op
  }

  /* ====================================================================
     GOLD CLASS eligibility calculator (the demoed value-prop slice).
     Pure client-side, no backend. Maps expected yield (kg) to ELT's own
     published Gold Class thresholds, returns tier + the input package it
     unlocks + an indicative band, and routes into apply / WhatsApp.
     ==================================================================== */
  function setupGoldCalc() {
    var form = document.getElementById("gc-calc");
    var result = document.getElementById("gc-result");
    if (!form || !result) return;

    var TIERS = [
      { key: "gold", name: "Gold", min: 1000, band: "$3,000 - $5,000+", color: "var(--gold)",
        pkg: ["Full seed bed package", "Land pack: chemicals, fertilizer + working capital", "Curing fuel + packaging", "Priority logistics + a dedicated extension officer", "Microinsurance cover"] },
      { key: "diamond", name: "Diamond", min: 700, band: "$2,000 - $3,000", color: "#9fc3d6",
        pkg: ["Seed bed package", "Land pack: chemicals + fertilizer", "Working capital", "Extension support", "Microinsurance cover"] },
      { key: "silver", name: "Silver", min: 500, band: "$1,200 - $2,000", color: "#c9c9c9",
        pkg: ["Seed bed package", "Core chemicals + fertilizer", "Working capital", "Extension support"] },
      { key: "bronze", name: "Bronze", min: 0, band: "$600 - $1,200", color: "#b07d4a",
        pkg: ["Starter seed bed package", "Essential inputs", "Extension support"] }
    ];

    function tierFor(kg) {
      for (var i = 0; i < TIERS.length; i++) if (kg >= TIERS[i].min) return { tier: TIERS[i], idx: i };
      return { tier: TIERS[TIERS.length - 1], idx: TIERS.length - 1 };
    }

    function render(kg, region, type) {
      var r = tierFor(kg), t = r.tier;
      var lit = 4 - r.idx, meter = "";
      for (var m = 0; m < 4; m++) meter += '<span class="' + (m < lit ? "on" : "") + '"></span>';
      var pkg = t.pkg.map(function (p) { return "<li>" + p + "</li>"; }).join("");
      var waMsg = encodeURIComponent("Hi ELT, I would like to apply for Gold Class financing. Expected yield: " + kg + "kg (" + t.name + " tier). Region: " + (region || "n/a") + ". Tobacco: " + (type || "n/a") + ".");
      var old = result.querySelector(".cr-card"); if (old) result.removeChild(old);
      var card = document.createElement("div");
      card.className = "cr-card";
      card.innerHTML =
        '<span class="cr-tier-badge" style="background:' + t.color + '">Gold Class</span>' +
        '<div class="cr-meter">' + meter + '</div>' +
        '<div class="cr-tier">' + t.name + '<small>' + kg + ' kg expected &middot; ' + (region || "Zimbabwe") + '</small></div>' +
        '<p class="cr-band">Indicative input + working-capital package: <b>' + t.band + '</b></p>' +
        '<ul class="cr-pkg">' + pkg + '</ul>' +
        '<div class="cr-actions">' +
          '<button class="btn btn-gold" data-gc-apply><span class="lbl">Apply for this tier</span></button>' +
          '<a class="wa-cta" href="https://wa.me/263242620290?text=' + waMsg + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.9 1.2 2.9.8 3.5.8.5 0 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2"/></svg>' +
            'Apply on WhatsApp</a>' +
        '</div>';
      result.classList.add("has-result");
      result.appendChild(card);
      var ga = card.querySelector("[data-gc-apply]");
      if (ga) ga.addEventListener("click", function (e) { e.preventDefault(); openApply(); });
      if (hasGSAP && !reduceMotion) gsap.from(card, { y: 14, autoAlpha: 0, duration: 0.5, ease: "power3.out" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var kg = parseInt(form.querySelector('[name="kg"]').value, 10);
      if (isNaN(kg) || kg < 0) kg = 0;
      var region = form.querySelector('[name="region"]') ? form.querySelector('[name="region"]').value : "";
      var type = form.querySelector('[name="type"]') ? form.querySelector('[name="type"]').value : "";
      render(kg, region, type);
    });
  }

  /* contact-page message form (no backend in this demo build) */
  function setupContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var ok = document.getElementById("cf-success");
    var err = document.getElementById("cf-error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // banners are hidden at rest (no state class); toggle the class on submit
      if (ok) ok.classList.remove("success");
      if (err) err.classList.remove("error");
      var name = form.querySelector('[name="fullname"]');
      var phone = form.querySelector('[name="phone"]');
      if (!name.value.trim() || !phone.value.trim()) {
        if (err) { err.textContent = "Please add your name and phone so we can reach you."; err.classList.add("error"); }
        return;
      }
      form.querySelectorAll("input, textarea, button").forEach(function (f) { f.setAttribute("disabled", "true"); });
      if (ok) ok.classList.add("success");
    });
  }

  /* mark the active nav link for the current page */
  function setupNavCurrent() {
    var path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      if (a.getAttribute("href") === path) a.setAttribute("aria-current", "page");
    });
  }

  /* ====================================================================
     BOOT
     ==================================================================== */
  function boot() {
    setupSplitReveals();
    setupDataReveals();
    setupLines();
    setupHeaderFlip();
    setupHeroGradient();
    setupTrail();
    setupHeroTransition();
    setupScrollCanvas();   // "Meet ELT" beat: scroll-scrubbed real farmer-field footage
    setupPlantCanvas();
    setupProducts();
    setupIconGlow();
    setupTiltCards();
    setupFlipper();
    setupRegions();
    setupMenu();
    setupApply();
    setupGoldCalc();
    setupContactForm();
    setupNavCurrent();
    runPreloader();

    // refresh triggers after fonts settle
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (hasST) ScrollTrigger.refresh(); });
    }
    if (hasST) {
      window.addEventListener("load", function () { ScrollTrigger.refresh(); });
      if (lenis) lenis.on("scroll", function () {}); // keep alive
      window.addEventListener("resize", function () { ScrollTrigger.refresh(); });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
