/* global gsap, ScrollTrigger, Lenis, THREE */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    isTouch: false,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    hero3dEnabled: true,
  };

  const hasGSAP = () => typeof window.gsap !== "undefined";
  const hasScrollTrigger = () => typeof window.ScrollTrigger !== "undefined";
  const hasLenis = () => typeof window.Lenis !== "undefined";
  const hasTHREE = () => typeof window.THREE !== "undefined";

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function splitText(el, mode = "chars") {
    const original = el.textContent ?? "";
    const parts = original.replace(/\s+/g, " ").trim().split("");
    if (!original.trim()) return;

    // Preserve <br> by using innerHTML parsing if there are tags
    const hasTags = el.innerHTML.includes("<");
    if (hasTags) {
      // Replace text nodes only
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n.nodeValue && n.nodeValue.trim().length) textNodes.push(n);
      }
      textNodes.forEach((n) => {
        const frag = document.createDocumentFragment();
        const chars = n.nodeValue.split("");
        chars.forEach((ch) => {
          if (ch === " ") {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const span = document.createElement("span");
          span.className = mode === "words" ? "word" : "char";
          span.textContent = ch;
          frag.appendChild(span);
        });
        n.parentNode?.replaceChild(frag, n);
      });
      return;
    }

    el.textContent = "";
    const frag = document.createDocumentFragment();
    if (mode === "words") {
      const words = original.replace(/\s+/g, " ").trim().split(" ");
      words.forEach((w, idx) => {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = w;
        span.style.display = "inline-block";
        frag.appendChild(span);
        if (idx !== words.length - 1) frag.appendChild(document.createTextNode(" "));
      });
    } else {
      parts.forEach((ch) => {
        if (ch === " ") {
          frag.appendChild(document.createTextNode(" "));
          return;
        }
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        frag.appendChild(span);
      });
    }
    el.appendChild(frag);
  }

  function setButtonRipple(e, el) {
    const r = el.getBoundingClientRect();
    const rx = ((e.clientX - r.left) / r.width) * 100;
    const ry = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--rx", `${clamp(rx, 0, 100)}%`);
    el.style.setProperty("--ry", `${clamp(ry, 0, 100)}%`);
  }

  function initCursor() {
    // Detect touch early
    state.isTouch =
      "ontouchstart" in window ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      (navigator.msMaxTouchPoints ?? 0) > 0;

    document.body.classList.toggle("isTouch", state.isTouch);
    if (state.isTouch) return;

    const cursor = $(".cursor");
    const dot = $(".cursor__dot", cursor);
    const ring = $(".cursor__ring", cursor);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx;
    let dy = my;
    let rx = mx;
    let ry = my;
    let ringScale = 1;
    let dotScale = 1;

    const render = () => {
      dx = lerp(dx, mx, 0.35);
      dy = lerp(dy, my, 0.35);
      rx = lerp(rx, mx, 0.14);
      ry = lerp(ry, my, 0.14);

      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%) scale(${dotScale})`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${ringScale})`;

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );

    const hoverIn = (kind) => {
      if (kind === "cta") {
        ringScale = 1.55;
        dotScale = 0.8;
        ring.style.borderColor = "rgba(77,255,223,.55)";
      } else if (kind === "project") {
        ringScale = 1.35;
        dotScale = 0.9;
        ring.style.borderColor = "rgba(255,92,0,.48)";
      } else {
        ringScale = 1.25;
        dotScale = 0.9;
        ring.style.borderColor = "rgba(255,255,255,.35)";
      }
    };
    const hoverOut = () => {
      ringScale = 1;
      dotScale = 1;
      ring.style.borderColor = "rgba(255,255,255,.28)";
    };

    const hoverables = $$("[data-cursor]");
    hoverables.forEach((el) => {
      el.addEventListener("pointerenter", () => hoverIn(el.getAttribute("data-cursor")), { passive: true });
      el.addEventListener("pointerleave", hoverOut, { passive: true });
    });
  }

  function initMagnetics() {
    if (state.isTouch) return;
    const items = $$(".magnetic");
    items.forEach((el) => {
      let tx = 0;
      let ty = 0;
      let raf = 0;

      const strength = el.classList.contains("btn") ? 0.22 : 0.16;
      const move = () => {
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        raf = 0;
      };

      el.addEventListener(
        "pointermove",
        (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
          const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          tx = clamp(x, -1, 1) * r.width * strength;
          ty = clamp(y, -1, 1) * r.height * strength;
          if (!raf) raf = requestAnimationFrame(move);
          if (el.classList.contains("btn")) setButtonRipple(e, el);
        },
        { passive: true }
      );
      el.addEventListener(
        "pointerleave",
        () => {
          tx = 0;
          ty = 0;
          el.style.transform = `translate3d(0,0,0)`;
        },
        { passive: true }
      );
    });

    // Update ripples on pointer move even without magnetic
    $$(".btn").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => setButtonRipple(e, btn), { passive: true });
    });
  }

  function initLenis() {
    if (state.reducedMotion || !hasLenis() || !hasGSAP() || !hasScrollTrigger()) return null;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 1.25,
      wheelMultiplier: 1.05,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    return lenis;
  }

  function initSplitText() {
    $$("[data-split]").forEach((el) => {
      const mode = el.getAttribute("data-split") || "chars";
      splitText(el, mode);
    });
  }

  function initCountersAndBars() {
    if (!hasGSAP() || !hasScrollTrigger()) return;
    const counters = $$("[data-count]");
    counters.forEach((el) => {
      const to = Number(el.getAttribute("data-count") || 0);
      el.textContent = "0";
      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to({ v: 0 }, {
            v: to,
            duration: 1.1,
            ease: "power2.out",
            onUpdate() {
              el.textContent = String(Math.round(this.targets()[0].v));
            },
          });
        },
      });
    });

    $$(".bar").forEach((bar) => {
      const fill = $(".bar__fill", bar);
      const v = Number(bar.getAttribute("data-bar") || 0);
      ScrollTrigger.create({
        trigger: bar,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to(fill, { width: `${clamp(v, 0, 1) * 100}%`, duration: 1.1, ease: "power2.out" });
        },
      });
    });
  }

  function initParallax() {
    if (!hasGSAP() || !hasScrollTrigger()) return;
    $$("[data-parallax]").forEach((el) => {
      const factor = Number(el.getAttribute("data-parallax") || 0.5);
      gsap.to(el, {
        yPercent: -18 * factor,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  }

  function initScrollReveals() {
    if (!hasGSAP() || !hasScrollTrigger()) return;
    gsap.registerPlugin(ScrollTrigger);

    // Nav fade in is part of load sequence; keep it ready.

    // Simple fades / lifts
    $$("[data-reveal='fadeUp']").forEach((el) => {
      const d = Number(getComputedStyle(el).getPropertyValue("--d")?.replace("s", "")) || 0;
      gsap.fromTo(
        el,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          delay: d,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        }
      );
    });

    // Headings: character-by-character
    $$("[data-reveal='heading']").forEach((el) => {
      const chars = $$(".char", el);
      gsap.set(el, { opacity: 1 });
      gsap.fromTo(
        chars,
        { yPercent: 110, opacity: 0, rotateZ: 2 },
        {
          yPercent: 0,
          opacity: 1,
          rotateZ: 0,
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.012,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        }
      );
    });

    // Hero title (special)
    const heroTitle = $("[data-reveal='heroTitle']");
    if (heroTitle) {
      const chars = $$(".char", heroTitle);
      gsap.set(heroTitle, { opacity: 1 });
      gsap.fromTo(
        chars,
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.0,
          ease: "power4.out",
          stagger: 0.012,
          paused: true,
          id: "heroTitleAnim",
        }
      );
    }

    // Image reveal
    $$("[data-reveal='image']").forEach((wrap) => {
      const img = $(".about__image", wrap);
      gsap.fromTo(
        wrap,
        { clipPath: "inset(10% 10% 10% 10% round 26px)", opacity: 0, y: 20 },
        {
          clipPath: "inset(0% 0% 0% 0% round 26px)",
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
        }
      );
      if (img) {
        gsap.fromTo(
          img,
          { scale: 1.1, filter: "saturate(0.95) contrast(0.95)" },
          {
            scale: 1.02,
            filter: "saturate(1.05) contrast(1.05)",
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
          }
        );
      }
    });

    // About copy lines (clip reveal)
    $$("[data-reveal='lines']").forEach((el) => {
      const ps = $$("p", el);
      ps.forEach((p) => {
        p.style.overflow = "hidden";
      });
      gsap.fromTo(
        ps,
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        }
      );
    });

    // Cards
    $$("[data-reveal='card']").forEach((card, i) => {
      gsap.fromTo(
        card,
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          delay: i * 0.05,
          scrollTrigger: { trigger: card, start: "top 88%", once: true },
        }
      );
    });

    // Skills bounce
    $$("[data-reveal='skill']").forEach((item, i) => {
      gsap.fromTo(
        item,
        { y: 18, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.8)",
          delay: i * 0.02,
          scrollTrigger: { trigger: item, start: "top 90%", once: true },
        }
      );
    });

    // Timeline
    $$("[data-reveal='timeline']").forEach((item, i) => {
      gsap.fromTo(
        item,
        { x: -18, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          delay: i * 0.06,
          scrollTrigger: { trigger: item, start: "top 88%", once: true },
        }
      );
    });
  }

  function initModal() {
    const modal = $("#projectModal");
    if (!modal) return;

    const closeBtn = $(".modal__close", modal);
    const title = $(".modal__title", modal);
    const desc = $(".modal__desc", modal);
    const tags = $(".modal__tags", modal);
    const media = $(".modal__media", modal);
    const actionBtns = $$(".modal__actions a", modal);

    const projects = [
      {
        title: "CipherShield",
        desc: "Cyber security dashboard concept with threat scoring, log streams, and alert triage UX.",
        tags: ["Cyber Security", "Dashboard", "UI"],
        live: "#",
        github: "#",
        theme: "a",
      },
      {
        title: "VISTORA LUXE",
        desc: "Luxury e-commerce storefront with cinematic product cards, fast filtering, and premium motion.",
        tags: ["E-commerce", "UI/UX", "Animation"],
        live: "#",
        github: "#",
        theme: "b",
      },
      {
        title: "Neon Atlas",
        desc: "Interactive portfolio concept with a 3D hero layer and scroll-based storytelling sections.",
        tags: ["GSAP", "Three.js", "ScrollTrigger"],
        live: "#",
        github: "#",
        theme: "c",
      },
    ];

    function setProject(p) {
      title.textContent = p.title;
      desc.textContent = p.desc;
      tags.innerHTML = p.tags.map((t) => `<span class="chip">${t}</span>`).join("");
      actionBtns[0].setAttribute("href", p.live);
      actionBtns[1].setAttribute("href", p.github);
      media.className = "modal__media";
      media.classList.add(`modal__media--${p.theme}`);
    }

    $$("[data-open-project]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const idx = Number(el.getAttribute("data-open-project") || 0);
        const p = projects[clamp(idx, 0, projects.length - 1)];
        setProject(p);
        if (typeof modal.showModal === "function") {
          modal.showModal();
        }
        if (hasGSAP()) {
          gsap.fromTo(
            $(".modal__inner", modal),
            { y: 18, opacity: 0, scale: 0.98 },
            { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }
          );
        }
      });
    });

    const close = () => {
      if (!modal.open) return;
      if (!hasGSAP()) {
        modal.close();
        return;
      }
      gsap.to($(".modal__inner", modal), {
        y: 10,
        opacity: 0,
        scale: 0.98,
        duration: 0.22,
        ease: "power2.in",
        onComplete: () => modal.close(),
      });
    };
    closeBtn?.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      const r = $(".modal__inner", modal).getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function initFormValidation() {
    const form = $(".form");
    if (!form) return;
    const fields = $$(".field", form);

    function updateField(field) {
      const input = $("input, textarea", field);
      if (!input) return;
      const invalid = !input.checkValidity();
      field.classList.toggle("isInvalid", invalid && input.value.length > 0);
    }

    fields.forEach((f) => {
      const input = $("input, textarea", f);
      if (!input) return;
      input.addEventListener("input", () => updateField(f), { passive: true });
      input.addEventListener("blur", () => updateField(f), { passive: true });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      fields.forEach(updateField);
      const invalid = fields.some((f) => f.classList.contains("isInvalid")) || !form.checkValidity();
      if (invalid) {
        if (hasGSAP()) {
          gsap.fromTo(form, { x: -3 }, { x: 0, duration: 0.38, ease: "elastic.out(1, .35)" });
        }
        return;
      }
      if (hasGSAP()) {
        gsap.to(form, { opacity: 0.75, duration: 0.2, ease: "power2.out" });
        setTimeout(() => gsap.to(form, { opacity: 1, duration: 0.2, ease: "power2.out" }), 260);
      }
    });
  }

  function fallbackRevealPage() {
    const pre = $(".preloader");
    const nav = $("[data-reveal='nav']");
    if (nav) {
      nav.style.transform = "translateY(0)";
      nav.style.opacity = "1";
    }
    if (pre) {
      pre.style.transition = "transform 520ms cubic-bezier(.2,.8,.2,1)";
      pre.style.transform = "translateY(-120%)";
      setTimeout(() => {
        pre.style.display = "none";
        pre.setAttribute("aria-hidden", "true");
      }, 560);
    }
  }

  function runPreloaderFallback() {
    const pre = $(".preloader");
    if (!pre) return;
    const bar = $(".preloader__bar", pre);
    const percent = $(".preloader__percentValue", pre);
    const start = performance.now();
    const dur = 1500;

    const tick = (now) => {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(eased * 100);
      if (percent) percent.textContent = String(v);
      if (bar) bar.style.setProperty("--p", `${v}%`);
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(fallbackRevealPage, 500);
    };
    requestAnimationFrame(tick);
  }

  function initToTop(lenis) {
    const btn = $(".toTop");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.15 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function initLoadSequence() {
    if (!hasGSAP()) {
      runPreloaderFallback();
      return;
    }
    const pre = $(".preloader");
    const bar = $(".preloader__bar", pre);
    const percent = $(".preloader__percentValue", pre);
    const nav = $("[data-reveal='nav']");
    const heroTitle = $("[data-reveal='heroTitle']");
    const heroSub = $(".hero__sub");
    const heroCtas = $(".hero__cta");
    const heroBg = $("#bg");

    const durationToHundred = 1.5;
    const t = gsap.timeline({ defaults: { ease: "power3.out" } });
    const counter = { v: 0 };

    // Counter + bar fill
    t.to(counter, {
      v: 100,
      duration: durationToHundred,
      ease: "power2.out",
      onUpdate: () => {
        const v = Math.round(counter.v);
        percent.textContent = String(v);
        bar.style.setProperty("--p", `${v}%`);
      },
    });

    // Reveal out
    t.to(pre, { yPercent: -110, duration: 0.6, ease: "power4.inOut" }, 2.0);
    t.set(pre, { display: "none" });

    // Nav in
    if (nav) t.to(nav, { y: 0, opacity: 1, duration: 0.7 }, 2.2);

    // Hero title
    if (heroTitle) {
      const chars = $$(".char", heroTitle);
      t.fromTo(
        chars,
        { yPercent: 120, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.0, ease: "power4.out", stagger: 0.012 },
        2.4
      );
    }

    // Hero subtext
    if (heroSub) t.fromTo(heroSub, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 2.8);

    // CTA bounce
    if (heroCtas) t.fromTo(heroCtas, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "back.out(1.7)" }, 3.0);

    // Background canvas subtle in
    if (heroBg) t.fromTo(heroBg, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 3.2);

    // Remove preloader from accessibility tree once done
    t.call(() => pre?.setAttribute("aria-hidden", "true"));

  }

  function initThreeHero() {
    const canvas = $("#bg");
    if (!canvas || !hasTHREE() || !hasScrollTrigger()) return null;

    const isSmall = window.matchMedia?.("(max-width: 980px)")?.matches ?? false;
    const isLowEnd = (navigator.hardwareConcurrency ?? 8) <= 4;
    state.hero3dEnabled = !state.reducedMotion && !state.isTouch && !isSmall && !isLowEnd;

    if (!state.hero3dEnabled) {
      canvas.style.display = "none";
      return null;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.IcosahedronGeometry(1.25, 2);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0d0d0d),
      metalness: 0.85,
      roughness: 0.25,
      emissive: new THREE.Color(0x00110c),
      emissiveIntensity: 0.85,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: new THREE.Color(0x4dffdf), transparent: true, opacity: 0.18 })
    );
    group.add(wire);

    const lightA = new THREE.DirectionalLight(0x4dffdf, 1.15);
    lightA.position.set(2.4, 1.6, 2.2);
    scene.add(lightA);

    const lightB = new THREE.DirectionalLight(0xff5c00, 0.75);
    lightB.position.set(-2.6, -1.2, 2.8);
    scene.add(lightB);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    let targetRotX = 0;
    let targetRotY = 0;
    let curRotX = 0;
    let curRotY = 0;

    window.addEventListener(
      "pointermove",
      (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        targetRotY = nx * 0.35;
        targetRotX = -ny * 0.25;
      },
      { passive: true }
    );

    // Subtle scroll-based parallax
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        group.position.y = -self.progress * 0.35;
      },
    });

    let running = true;
    const tick = () => {
      if (!running) return;
      curRotX = lerp(curRotX, targetRotX, 0.06);
      curRotY = lerp(curRotY, targetRotY, 0.06);
      group.rotation.x = curRotX + performance.now() * 0.00018;
      group.rotation.y = curRotY + performance.now() * 0.00022;
      group.rotation.z = performance.now() * 0.00006;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const onResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      running = false;
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }

  function wirePreloaderBarVar() {
    // Our CSS uses ::before width, but we update a CSS var; ensure it exists.
    const bar = $(".preloader__bar");
    if (!bar) return;
    bar.style.setProperty("--p", "0%");
  }

  function setYear() {
    const y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function boot() {
    setYear();
    wirePreloaderBarVar();
    initCursor();
    initMagnetics();

    const canAnimate = hasGSAP() && hasScrollTrigger();
    if (canAnimate) gsap.registerPlugin(ScrollTrigger);
    const lenis = initLenis();

    initSplitText();
    initScrollReveals();
    initCountersAndBars();
    initParallax();
    initModal();
    initFormValidation();
    initToTop(lenis);

    initLoadSequence();
    initThreeHero();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

