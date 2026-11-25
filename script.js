/* ============================================================
   KLAEDE — Homepage interactions
   ============================================================ */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const scrollBehavior = () => (reduceMotion ? "auto" : "smooth");

  /* ----------------------------------------------------------
     Header
     ---------------------------------------------------------- */

  const header = qs("[data-header]");

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const primaryLinks = qsa(".primary-nav .nav-link");

  const setCurrentNav = (href) => {
    primaryLinks.forEach((link) => {
      link.classList.toggle("is-current", link.getAttribute("href") === href);
    });
  };

  if ("IntersectionObserver" in window) {
    const observed = primaryLinks
      .filter((link) => link.getAttribute("href") !== "#top")
      .map((link) => {
        const target = qs(link.getAttribute("href"));
        return target ? { link, target } : null;
      })
      .filter(Boolean);

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = observed.find((item) => item.target === entry.target);
          if (match) setCurrentNav(match.link.getAttribute("href"));
        });
      },
      { rootMargin: "-38% 0px -52% 0px", threshold: 0 }
    );

    observed.forEach((item) => navObserver.observe(item.target));

    window.addEventListener(
      "scroll",
      () => {
        if (window.scrollY < 220) setCurrentNav("#top");
      },
      { passive: true }
    );
  }

  /* ----------------------------------------------------------
     Dialogs
     ---------------------------------------------------------- */

  const dialogs = qsa("dialog");

  const syncBodyLock = () => {
    document.body.classList.toggle("dialog-open", Boolean(qs("dialog[open]")));
  };

  const closeDialog = (dialog) => {
    if (dialog && dialog.open) dialog.close();
  };

  const openDialog = (dialog) => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    syncBodyLock();
  };

  dialogs.forEach((dialog) => {
    dialog.addEventListener("close", syncBodyLock);
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const clickedInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!clickedInside) closeDialog(dialog);
    });
  });

  qsa("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });

  window.addEventListener("resize", () => {
    const menuDialog = qs("#menu-dialog");
    if (window.innerWidth > 960 && menuDialog?.open) closeDialog(menuDialog);
  });

  /* ----------------------------------------------------------
     Toast
     ---------------------------------------------------------- */

  const toast = qs("[data-toast]");
  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 3200);
  };

  /* ----------------------------------------------------------
     Mobile navigation & account
     ---------------------------------------------------------- */

  const menuDialog = qs("#menu-dialog");

  qs("[data-menu-open]")?.addEventListener("click", () => openDialog(menuDialog));

  qsa(".mobile-nav a, .menu-dialog .drawer-socials a").forEach((link) => {
    link.addEventListener("click", () => closeDialog(menuDialog));
  });

  qs("[data-account]")?.addEventListener("click", () => {
    showToast("Client accounts are being prepared. Please check back soon.");
  });

  /* ----------------------------------------------------------
     Hero campaign slider
     ---------------------------------------------------------- */

  const hero = qs("[data-hero]");

  if (hero) {
    const slides = qsa("[data-hero-slide]", hero);
    const dots = qsa("[data-hero-dot]", hero);
    const previousButton = qs("[data-hero-prev]", hero);
    const nextButton = qs("[data-hero-next]", hero);

    let activeIndex = 0;
    let autoplayTimer;
    let touchStartX = null;

    const track = qs(".hero-track", hero);
    const mobileQuery = window.matchMedia("(max-width: 900px)");

    const showSlide = (index, restart = true, scrollTrack = true) => {
      activeIndex = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });

      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
      });

      if (scrollTrack && track && mobileQuery.matches) {
        const slide = slides[activeIndex];
        track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
      }

      if (restart) restartAutoplay();
    };

    const startAutoplay = () => {
      if (slides.length < 2) return;
      window.clearInterval(autoplayTimer);
      autoplayTimer = window.setInterval(() => {
        showSlide(activeIndex + 1, false);
      }, 7000);
    };

    const stopAutoplay = () => {
      window.clearInterval(autoplayTimer);
    };

    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        showSlide(Number(dot.dataset.heroDot));
      });
    });

    previousButton?.addEventListener("click", () => showSlide(activeIndex - 1));
    nextButton?.addEventListener("click", () => showSlide(activeIndex + 1));

    hero.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0].clientX;
      },
      { passive: true }
    );

    hero.addEventListener(
      "touchend",
      (event) => {
        if (mobileQuery.matches) { touchStartX = null; return; }
        if (touchStartX === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX;
        touchStartX = null;

        if (Math.abs(delta) < 45) return;
        showSlide(activeIndex + (delta < 0 ? 1 : -1));
      },
      { passive: true }
    );

    let swipeTimer;
    track?.addEventListener(
      "scroll",
      () => {
        if (!mobileQuery.matches) return;
        window.clearTimeout(swipeTimer);
        swipeTimer = window.setTimeout(() => {
          const center = track.scrollLeft + track.clientWidth / 2;
          let best = 0;
          let bestDistance = Infinity;
          slides.forEach((slide, i) => {
            const distance = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
            if (distance < bestDistance) { bestDistance = distance; best = i; }
          });
          if (best !== activeIndex) showSlide(best, true, false);
        }, 90);
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    startAutoplay();
  }

  /* ----------------------------------------------------------
     Product carousel
     ---------------------------------------------------------- */

  const carousel = qs("[data-product-carousel]");

  if (carousel) {
    const track = qs(".product-track", carousel);
    const cards = qsa(".product-card", carousel);
    const previousButton = qs("[data-product-prev]");
    const nextButton = qs("[data-product-next]");
    const currentLabel = qs("[data-product-current]");

    const getStep = () => {
      if (!cards.length) return 0;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    };

    const updateCarousel = () => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      const step = getStep();
      const firstVisible = step ? Math.round(carousel.scrollLeft / step) : 0;

      if (previousButton) previousButton.disabled = carousel.scrollLeft <= 2;
      if (nextButton) nextButton.disabled = carousel.scrollLeft >= maxScroll - 2;
      if (currentLabel) {
        currentLabel.textContent = String(Math.min(firstVisible + 1, cards.length)).padStart(2, "0");
      }
    };

    const scrollCarousel = (direction) => {
      const step = getStep();
      carousel.scrollBy({
        left: step * direction,
        behavior: scrollBehavior(),
      });
    };

    previousButton?.addEventListener("click", () => scrollCarousel(-1));
    nextButton?.addEventListener("click", () => scrollCarousel(1));

    carousel.addEventListener("scroll", () => {
      window.requestAnimationFrame(updateCarousel);
    }, { passive: true });

    window.addEventListener("resize", updateCarousel);

    updateCarousel();
    window.setTimeout(updateCarousel, 350);
  }

  /* ----------------------------------------------------------
     Wishlist
     ---------------------------------------------------------- */

  qsa("[data-wishlist]").forEach((button) => {
    button.addEventListener("click", () => {
      const isSaved = button.classList.toggle("is-active");
      button.setAttribute("aria-pressed", String(isSaved));

      const productName = qs(".product-name", button.closest(".product-card"))?.textContent.trim() || "Piece";
      button.setAttribute(
        "aria-label",
        `${isSaved ? "Remove" : "Add"} ${productName} ${isSaved ? "from" : "to"} wishlist`
      );

      showToast(isSaved ? `${productName} saved to your wishlist.` : `${productName} removed from your wishlist.`);
    });
  });

  /* ----------------------------------------------------------
     Testimonials
     ---------------------------------------------------------- */

  const testimonial = qs("[data-testimonial]");

  if (testimonial) {
    const slides = qsa("[data-testimonial-slide]", testimonial);
    const dots = qsa("[data-testimonial-dot]");
    const previousButton = qs("[data-testimonial-prev]");
    const nextButton = qs("[data-testimonial-next]");

    let activeIndex = 0;

    const showTestimonial = (index) => {
      activeIndex = (index + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle("is-active", isActive);
        slide.hidden = !isActive;
      });

      dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === activeIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
      });
    };

    dots.forEach((dot) => {
      dot.addEventListener("click", () => showTestimonial(Number(dot.dataset.testimonialDot)));
    });

    previousButton?.addEventListener("click", () => showTestimonial(activeIndex - 1));
    nextButton?.addEventListener("click", () => showTestimonial(activeIndex + 1));
  }

  /* ----------------------------------------------------------
     Search
     ---------------------------------------------------------- */

  const searchDialog = qs("#search-dialog");
  const searchInput = qs("[data-search-input]");
  const searchForm = qs("[data-search-form]");
  const searchResults = qs("[data-search-results]");
  const searchPopular = qs("[data-search-popular]");

  const productData = qsa(".product-card").map((card) => ({
    id: card.dataset.productId,
    name: qs(".product-name", card)?.textContent.trim() || "KLAEDE piece",
    category: qs(".product-category", card)?.textContent.trim() || "Collection",
    price: qs(".product-price", card)?.textContent.trim() || "",
    image: qs(".product-media img", card)?.getAttribute("src") || "",
    alt: qs(".product-media img", card)?.getAttribute("alt") || "",
    card,
  }));

  const escapeHTML = (value) =>
    value.replace(/[&<>"']/g, (character) => {
      const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return entities[character];
    });

  const renderSearchResults = (query) => {
    if (!searchResults || !searchPopular) return;

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      searchResults.innerHTML = "";
      searchResults.hidden = true;
      searchPopular.hidden = false;
      return;
    }

    const matches = productData.filter((product) =>
      `${product.name} ${product.category}`.toLowerCase().includes(normalizedQuery)
    );

    searchResults.hidden = false;
    searchPopular.hidden = true;

    if (!matches.length) {
      searchResults.innerHTML = `<p class="search-empty">No pieces found. Try “shirt”, “trouser”, or “evening”.</p>`;
      return;
    }

    searchResults.innerHTML = matches
      .map(
        (product) => `
          <button class="search-result" type="button" data-search-result="${escapeHTML(product.id)}">
            <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.alt)}" loading="lazy">
            <span class="search-result__copy">
              <span class="search-result__category">${escapeHTML(product.category)}</span>
              <span class="search-result__name">${escapeHTML(product.name)}</span>
              <span class="search-result__price">${escapeHTML(product.price)}</span>
            </span>
          </button>`
      )
      .join("");
  };

  qs("[data-search-open]")?.addEventListener("click", () => {
    openDialog(searchDialog);
    window.requestAnimationFrame(() => searchInput?.focus());
  });

  searchInput?.addEventListener("input", (event) => renderSearchResults(event.target.value));

  searchDialog?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.activeElement === searchInput) {
      event.preventDefault();
      closeDialog(searchDialog);
    }
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    renderSearchResults(searchInput?.value || "");
  });

  qsa("[data-search-term]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!searchInput) return;
      searchInput.value = button.dataset.searchTerm || "";
      renderSearchResults(searchInput.value);
      searchInput.focus();
    });
  });

  searchResults?.addEventListener("click", (event) => {
    const result = event.target.closest("[data-search-result]");
    if (!result) return;

    const product = productData.find((item) => item.id === result.dataset.searchResult);
    if (!product) return;

    closeDialog(searchDialog);
    window.setTimeout(() => {
      product.card.scrollIntoView({ behavior: scrollBehavior(), block: "center", inline: "center" });
      product.card.classList.remove("is-highlighted");
      void product.card.offsetWidth;
      product.card.classList.add("is-highlighted");
      window.setTimeout(() => product.card.classList.remove("is-highlighted"), 1900);
    }, 160);
  });

  /* ----------------------------------------------------------
     Shopping bag
     ---------------------------------------------------------- */

  const cartDialog = qs("#cart-dialog");
  const cartItemsElement = qs("[data-cart-items]");
  const cartCountElement = qs("[data-cart-count]");
  const cartCountLabel = qs("[data-cart-count-label]");
  const cartSubtotalElement = qs("[data-cart-subtotal]");
  const checkoutButton = qs("[data-checkout]");
  const cartOpenButton = qs("[data-cart-open]");
  const cart = new Map();

  const formatMoney = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const getCartSummary = () => {
    const items = Array.from(cart.values());
    const count = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    return { items, count, subtotal };
  };

  const emptyCartMarkup = () => `
    <div class="cart-empty">
      <span class="cart-empty__mark" aria-hidden="true">K</span>
      <h3>Your bag is empty</h3>
      <p>Discover the pieces that belong in your everyday.</p>
      <button class="button button--maroon" type="button" data-cart-shop>Explore new arrivals</button>
    </div>`;

  const renderCart = () => {
    const { items, count, subtotal } = getCartSummary();

    if (cartCountElement) {
      cartCountElement.textContent = String(count);
      cartCountElement.hidden = count === 0;

      if (count > 0) {
        cartCountElement.classList.remove("is-bumping");
        void cartCountElement.offsetWidth;
        cartCountElement.classList.add("is-bumping");
      }
    }

    cartOpenButton?.setAttribute(
      "aria-label",
      count ? `Open shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Open shopping bag"
    );

    if (cartCountLabel) cartCountLabel.textContent = `(${count})`;
    if (cartSubtotalElement) cartSubtotalElement.textContent = formatMoney(subtotal);
    if (checkoutButton) checkoutButton.disabled = count === 0;

    if (!cartItemsElement) return;

    if (!items.length) {
      cartItemsElement.innerHTML = emptyCartMarkup();
      return;
    }

    cartItemsElement.innerHTML = items
      .map(
        (item) => `
          <div class="cart-item" data-cart-id="${escapeHTML(item.id)}">
            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.alt)}" loading="lazy">
            <div class="cart-item__info">
              <p class="cart-item__name">${escapeHTML(item.name)}</p>
              <p class="cart-item__price">${formatMoney(item.price)}</p>
              <div class="quantity" aria-label="Quantity for ${escapeHTML(item.name)}">
                <button type="button" data-cart-action="decrease" aria-label="Decrease quantity">
                  <svg class="icon" aria-hidden="true"><use href="#icon-minus"/></svg>
                </button>
                <span>${item.quantity}</span>
                <button type="button" data-cart-action="increase" aria-label="Increase quantity">
                  <svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg>
                </button>
              </div>
            </div>
            <button class="cart-item__remove" type="button" data-cart-action="remove" aria-label="Remove ${escapeHTML(item.name)}">Remove</button>
          </div>`
      )
      .join("");
  };

  const addToCart = (product) => {
    const existing = cart.get(product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.set(product.id, { ...product, quantity: 1 });
    }

    renderCart();
    showToast(`${product.name} added to your bag.`);
  };

  qs("[data-cart-open]")?.addEventListener("click", () => {
    renderCart();
    openDialog(cartDialog);
  });

  qsa("[data-add-to-bag]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      if (!card) return;

      addToCart({
        id: card.dataset.productId,
        name: qs(".product-name", card)?.textContent.trim() || "KLAEDE piece",
        price: Number(qs(".product-price", card)?.dataset.price || 0),
        image: qs(".product-media img", card)?.getAttribute("src") || "",
        alt: qs(".product-media img", card)?.getAttribute("alt") || "",
      });
    });
  });

  cartItemsElement?.addEventListener("click", (event) => {
    const shopButton = event.target.closest("[data-cart-shop]");
    if (shopButton) {
      closeDialog(cartDialog);
      window.setTimeout(() => {
        qs("#new-in")?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      }, 80);
      return;
    }

    const actionButton = event.target.closest("[data-cart-action]");
    if (!actionButton) return;

    const itemElement = actionButton.closest("[data-cart-id]");
    const item = cart.get(itemElement?.dataset.cartId || "");
    if (!item) return;

    switch (actionButton.dataset.cartAction) {
      case "increase":
        item.quantity += 1;
        break;
      case "decrease":
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          cart.delete(item.id);
        }
        break;
      case "remove":
        cart.delete(item.id);
        break;
      default:
        break;
    }

    renderCart();
  });

  checkoutButton?.addEventListener("click", () => {
    if (!cart.size) return;
    closeDialog(cartDialog);
    showToast("Checkout is a preview in this concept store.");
  });

  renderCart();

  /* ----------------------------------------------------------
     Footer
     ---------------------------------------------------------- */

  qs("[data-back-to-top]")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  });
})();

/* ==========================================================
   Smooth wheel scrolling
   ========================================================== */
(function () {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  var root = document.documentElement;
  var EASE = 0.085; // smaller = smoother/slower (0.05 - 0.2)
  var target = window.scrollY, current = target, raf = null;

  root.classList.add("has-smooth");

  function maxScroll() { return root.scrollHeight - window.innerHeight; }
  function clamp(v) { return Math.max(0, Math.min(maxScroll(), v)); }

  function loop() {
    // Scroll changed by something else (scrollbar drag, keyboard, script): follow it.
    if (Math.abs(window.scrollY - current) > 2) {
      target = current = window.scrollY;
      raf = null;
      return;
    }
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.4) current = target;
    window.scrollTo(0, current);
    raf = current === target ? null : requestAnimationFrame(loop);
  }

  function start() {
    if (!raf) {
      current = window.scrollY;
      raf = requestAnimationFrame(loop);
    }
  }

  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey || e.defaultPrevented) return;
    if (document.querySelector("dialog[open]")) return;

    // Leave inner scrollable areas (textarea, lists) alone.
    for (var el = e.target; el && el !== document.body && el !== root; el = el.parentElement) {
      if (el.nodeType !== 1) continue;
      var oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) return;
    }

    e.preventDefault();
    var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (!raf) target = current = window.scrollY;
    target = clamp(target + dy);
    start();
  }, { passive: false });

  // In-page links (#section) glide too.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    var id = a.getAttribute("href").slice(1);
    var el = id && document.getElementById(decodeURIComponent(id));
    if (!el) return;
    e.preventDefault();
    var header = document.querySelector(".site-header");
    if (!raf) target = current = window.scrollY;
    target = clamp(el.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0));
    start();
    history.replaceState(null, "", "#" + id);
  });
})();

/* ==========================================================
   Header search (Shop, Women, Men, Accessories)
   ========================================================== */
(function () {
  var form = document.querySelector("[data-shop-search-form]");
  var input = document.querySelector("[data-shop-search]");
  if (!form || !input) return;
  var toggle = form.querySelector("[data-search-toggle]");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".p-card"));
  var empty = document.querySelector("[data-no-results]");

  function filter() {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var match = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
      card.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown !== 0;
  }

  function setOpen(open) {
    form.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
    else { input.value = ""; filter(); }
  }

  toggle.addEventListener("click", function () {
    setOpen(!form.classList.contains("is-open"));
  });
  input.addEventListener("input", filter);
  form.addEventListener("submit", function (e) { e.preventDefault(); filter(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && form.classList.contains("is-open")) setOpen(false);
  });
  document.addEventListener("click", function (e) {
    if (form.classList.contains("is-open") && !input.value && !form.contains(e.target)) setOpen(false);
  });
})();
