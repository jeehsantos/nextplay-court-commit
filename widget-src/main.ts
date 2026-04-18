// NextPlay embeddable booking widget — vanilla TS, Shadow DOM, no React.
// Built as a single IIFE bundle and served from /widget/v1/widget.js

interface InitOptions {
  apiKey: string;
  container: string | HTMLElement;
  apiBase?: string;
}

interface Court {
  id: string;
  name: string;
  hourly_rate: number;
  photo_url: string | null;
  is_indoor: boolean | null;
  ground_type: string | null;
  capacity: number;
}

interface Venue {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  photo_url: string | null;
  slot_interval_minutes: number;
  max_booking_minutes: number;
}

interface Slot {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
}

interface Theme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

const DEFAULT_API_BASE = "https://zojlszsupatienxyvfqq.supabase.co/functions/v1";

class NextPlayWidgetInstance {
  private apiKey: string;
  private apiBase: string;
  private root: ShadowRoot;
  private host: HTMLElement;
  private state: {
    venue?: Venue;
    courts: Court[];
    theme: Theme;
    selectedCourt?: Court;
    selectedDate: string;
    slots: Slot[];
    selectedSlot?: Slot;
    guestName: string;
    guestEmail: string;
    loading: boolean;
    error?: string;
    step: "courts" | "slots" | "checkout" | "redirecting";
  };

  constructor(opts: InitOptions) {
    this.apiKey = opts.apiKey;
    this.apiBase = opts.apiBase ?? DEFAULT_API_BASE;

    const container =
      typeof opts.container === "string"
        ? document.querySelector<HTMLElement>(opts.container)
        : opts.container;
    if (!container) throw new Error(`NextPlayWidget: container not found: ${opts.container}`);

    this.host = container;
    this.root = container.attachShadow({ mode: "open" });

    const today = new Date().toISOString().slice(0, 10);
    this.state = {
      courts: [],
      theme: {},
      selectedDate: today,
      slots: [],
      guestName: "",
      guestEmail: "",
      loading: true,
      step: "courts",
    };

    this.render();
    void this.bootstrap();
    void this.track("widget_loaded");
  }

  private async api(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("x-widget-key", this.apiKey);
    headers.set("Content-Type", "application/json");
    const res = await fetch(`${this.apiBase}/${path}`, { ...init, headers });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`API ${res.status}: ${txt}`);
    }
    return res.json();
  }

  private async track(event: string, metadata: Record<string, unknown> = {}) {
    try {
      await this.api("widget-track-event", {
        method: "POST",
        body: JSON.stringify({ event, metadata, page_url: location.href }),
      });
    } catch {/* swallow */}
  }

  private async bootstrap() {
    try {
      const data = await this.api("widget-venue");
      this.state.venue = data.venue;
      this.state.courts = data.courts;
      this.state.theme = data.theme ?? {};
      this.state.loading = false;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Failed to load";
      this.state.loading = false;
    }
    this.render();
  }

  private async loadSlots() {
    if (!this.state.selectedCourt) return;
    this.state.loading = true;
    this.state.slots = [];
    this.render();
    try {
      const data = await this.api(
        `widget-availability?court_id=${this.state.selectedCourt.id}&date=${this.state.selectedDate}`
      );
      this.state.slots = data.slots ?? [];
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Failed to load slots";
    } finally {
      this.state.loading = false;
      this.render();
    }
  }

  private async handleCheckout() {
    if (!this.state.selectedCourt || !this.state.selectedSlot) return;
    if (!this.state.guestName.trim() || !this.state.guestEmail.trim()) {
      this.state.error = "Name and email are required";
      this.render();
      return;
    }
    this.state.loading = true;
    this.state.error = undefined;
    this.state.step = "redirecting";
    this.render();
    try {
      void this.track("checkout_started", { court_id: this.state.selectedCourt.id });
      const data = await this.api("widget-create-booking", {
        method: "POST",
        body: JSON.stringify({
          court_id: this.state.selectedCourt.id,
          slot_id: this.state.selectedSlot.id,
          guest_name: this.state.guestName.trim(),
          guest_email: this.state.guestEmail.trim(),
          success_url: `${location.origin}${location.pathname}?widget_status=success`,
          cancel_url: `${location.origin}${location.pathname}?widget_status=cancelled`,
        }),
      });
      if (data.checkout_url) {
        location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Checkout failed";
      this.state.step = "checkout";
      this.state.loading = false;
      this.render();
    }
  }

  private styles() {
    const t = this.state.theme;
    const primary = t.primaryColor ?? "#0ea5e9";
    const bg = t.backgroundColor ?? "#ffffff";
    const text = t.textColor ?? "#0f172a";
    const radius = (t.borderRadius ?? "8") + "px";
    const font = t.fontFamily ?? "system-ui, -apple-system, sans-serif";
    return `
      :host { all: initial; }
      .np {
        font-family: ${font};
        color: ${text};
        background: ${bg};
        border-radius: ${radius};
        border: 1px solid rgba(0,0,0,0.08);
        padding: 20px;
        max-width: 100%;
        box-sizing: border-box;
      }
      .np * { box-sizing: border-box; }
      .np-header { margin-bottom: 16px; }
      .np-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
      .np-sub { font-size: 13px; opacity: 0.7; margin: 0; }
      .np-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
      .np-card {
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: ${radius};
        padding: 12px;
        cursor: pointer;
        background: ${bg};
        transition: all 0.15s;
      }
      .np-card:hover { border-color: ${primary}; transform: translateY(-1px); }
      .np-card.selected { border-color: ${primary}; box-shadow: 0 0 0 2px ${primary}33; }
      .np-card img { width: 100%; height: 100px; object-fit: cover; border-radius: ${radius}; margin-bottom: 8px; }
      .np-name { font-weight: 600; font-size: 14px; margin: 0 0 4px; }
      .np-meta { font-size: 12px; opacity: 0.7; }
      .np-btn {
        background: ${primary};
        color: white;
        border: none;
        border-radius: ${radius};
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      .np-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .np-btn-ghost { background: transparent; color: ${text}; border: 1px solid rgba(0,0,0,0.15); }
      .np-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .np-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: ${radius};
        font-size: 14px;
        font-family: inherit;
        background: ${bg};
        color: ${text};
      }
      .np-label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; margin-top: 12px; }
      .np-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px; }
      .np-slot {
        padding: 8px;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: ${radius};
        font-size: 13px;
        cursor: pointer;
        text-align: center;
        background: ${bg};
        color: ${text};
        font-family: inherit;
      }
      .np-slot:hover { border-color: ${primary}; }
      .np-slot.selected { background: ${primary}; color: white; border-color: ${primary}; }
      .np-error { color: #dc2626; font-size: 13px; margin: 8px 0; }
      .np-loading { padding: 24px; text-align: center; opacity: 0.6; }
      .np-back { background: none; border: none; color: ${primary}; cursor: pointer; padding: 0; font-size: 13px; margin-bottom: 8px; font-family: inherit; }
      .np-footer { font-size: 11px; opacity: 0.5; text-align: center; margin-top: 12px; }
    `;
  }

  private render() {
    const s = this.state;
    let body = "";

    if (s.loading && !s.venue) {
      body = `<div class="np-loading">Loading…</div>`;
    } else if (s.error && !s.venue) {
      body = `<div class="np-error">${s.error}</div>`;
    } else if (s.step === "courts") {
      body = `
        <div class="np-header">
          <h2 class="np-title">${s.venue?.name ?? ""}</h2>
          <p class="np-sub">Select a court to book</p>
        </div>
        <div class="np-grid">
          ${s.courts.map((c) => `
            <div class="np-card ${s.selectedCourt?.id === c.id ? "selected" : ""}" data-court="${c.id}">
              ${c.photo_url ? `<img src="${c.photo_url}" alt="">` : ""}
              <p class="np-name">${c.name}</p>
              <p class="np-meta">$${c.hourly_rate}/hr · ${c.is_indoor ? "Indoor" : "Outdoor"}</p>
            </div>
          `).join("")}
        </div>
      `;
    } else if (s.step === "slots") {
      body = `
        <button class="np-back" data-action="back-courts">← Back to courts</button>
        <div class="np-header">
          <h2 class="np-title">${s.selectedCourt?.name}</h2>
          <p class="np-sub">$${s.selectedCourt?.hourly_rate}/hr</p>
        </div>
        <label class="np-label">Date</label>
        <input class="np-input" type="date" value="${s.selectedDate}" data-action="date" min="${new Date().toISOString().slice(0,10)}">
        <label class="np-label">Available times</label>
        ${s.loading ? `<div class="np-loading">Loading…</div>` : s.slots.length === 0 ? `<p class="np-meta">No slots available for this date.</p>` : `
          <div class="np-slots">
            ${s.slots.map((slot) => `
              <button class="np-slot ${s.selectedSlot?.id === slot.id ? "selected" : ""}" data-slot="${slot.id}">
                ${slot.start_time.slice(0,5)}
              </button>
            `).join("")}
          </div>
        `}
        ${s.selectedSlot ? `<div style="margin-top:16px"><button class="np-btn" data-action="continue">Continue</button></div>` : ""}
      `;
    } else if (s.step === "checkout" || s.step === "redirecting") {
      body = `
        <button class="np-back" data-action="back-slots">← Back</button>
        <div class="np-header">
          <h2 class="np-title">Confirm booking</h2>
          <p class="np-sub">${s.selectedCourt?.name} · ${s.selectedDate} · ${s.selectedSlot?.start_time.slice(0,5)}–${s.selectedSlot?.end_time.slice(0,5)}</p>
        </div>
        <label class="np-label">Full name</label>
        <input class="np-input" data-action="name" value="${s.guestName}" placeholder="Jane Doe">
        <label class="np-label">Email</label>
        <input class="np-input" data-action="email" type="email" value="${s.guestEmail}" placeholder="jane@example.com">
        ${s.error ? `<div class="np-error">${s.error}</div>` : ""}
        <div style="margin-top:16px">
          <button class="np-btn" data-action="checkout" ${s.loading ? "disabled" : ""}>
            ${s.loading ? "Redirecting…" : `Pay $${s.selectedCourt?.hourly_rate}`}
          </button>
        </div>
      `;
    }

    this.root.innerHTML = `<style>${this.styles()}</style><div class="np">${body}<div class="np-footer">Powered by NextPlay</div></div>`;
    this.bind();
  }

  private bind() {
    this.root.querySelectorAll<HTMLElement>("[data-court]").forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.court!;
        this.state.selectedCourt = this.state.courts.find((c) => c.id === id);
        this.state.step = "slots";
        this.state.selectedSlot = undefined;
        this.render();
        void this.loadSlots();
      };
    });
    this.root.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
      el.onclick = () => {
        this.state.selectedSlot = this.state.slots.find((s) => s.id === el.dataset.slot);
        this.render();
      };
    });
    const get = (a: string) => this.root.querySelector<HTMLElement>(`[data-action="${a}"]`);
    const date = get("date") as HTMLInputElement | null;
    if (date) date.onchange = () => { this.state.selectedDate = date.value; void this.loadSlots(); };
    const back1 = get("back-courts");
    if (back1) back1.onclick = () => { this.state.step = "courts"; this.state.selectedSlot = undefined; this.render(); };
    const back2 = get("back-slots");
    if (back2) back2.onclick = () => { this.state.step = "slots"; this.state.error = undefined; this.render(); };
    const cont = get("continue");
    if (cont) cont.onclick = () => { this.state.step = "checkout"; this.render(); };
    const name = get("name") as HTMLInputElement | null;
    if (name) name.oninput = () => { this.state.guestName = name.value; };
    const email = get("email") as HTMLInputElement | null;
    if (email) email.oninput = () => { this.state.guestEmail = email.value; };
    const co = get("checkout");
    if (co) co.onclick = () => void this.handleCheckout();
  }
}

const NextPlayWidget = {
  init(opts: InitOptions) {
    return new NextPlayWidgetInstance(opts);
  },
};

(window as unknown as { NextPlayWidget: typeof NextPlayWidget }).NextPlayWidget = NextPlayWidget;

export default NextPlayWidget;
