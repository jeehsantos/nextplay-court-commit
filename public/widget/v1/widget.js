this.NextPlayWidget=function(){"use strict";const u="https://zojlszsupatienxyvfqq.supabase.co/functions/v1";class g{constructor(t){this.apiKey=t.apiKey,this.apiBase=t.apiBase??u;const e=typeof t.container=="string"?document.querySelector(t.container):t.container;if(!e)throw new Error(`NextPlayWidget: container not found: ${t.container}`);this.host=e,this.root=e.attachShadow({mode:"open"});const s=new Date().toISOString().slice(0,10);this.state={courts:[],theme:{},selectedDate:s,slots:[],guestName:"",guestEmail:"",loading:!0,step:"courts"},this.render(),this.bootstrap(),this.track("widget_loaded")}async api(t,e={}){const s=new Headers(e.headers);s.set("x-widget-key",this.apiKey),s.set("Content-Type","application/json");const a=await fetch(`${this.apiBase}/${t}`,{...e,headers:s});if(!a.ok){const o=await a.text();throw new Error(`API ${a.status}: ${o}`)}return a.json()}async track(t,e={}){try{await this.api("widget-track-event",{method:"POST",body:JSON.stringify({event:t,metadata:e,page_url:location.href})})}catch{}}async bootstrap(){try{const t=await this.api("widget-venue");this.state.venue=t.venue,this.state.courts=t.courts,this.state.theme=t.theme??{},this.state.loading=!1}catch(t){this.state.error=t instanceof Error?t.message:"Failed to load",this.state.loading=!1}this.render()}async loadSlots(){if(this.state.selectedCourt){this.state.loading=!0,this.state.slots=[],this.render();try{const t=await this.api(`widget-availability?court_id=${this.state.selectedCourt.id}&date=${this.state.selectedDate}`);this.state.slots=t.slots??[]}catch(t){this.state.error=t instanceof Error?t.message:"Failed to load slots"}finally{this.state.loading=!1,this.render()}}}async handleCheckout(){if(!(!this.state.selectedCourt||!this.state.selectedSlot)){if(!this.state.guestName.trim()||!this.state.guestEmail.trim()){this.state.error="Name and email are required",this.render();return}this.state.loading=!0,this.state.error=void 0,this.state.step="redirecting",this.render();try{this.track("checkout_started",{court_id:this.state.selectedCourt.id});const t=await this.api("widget-create-booking",{method:"POST",body:JSON.stringify({court_id:this.state.selectedCourt.id,slot_id:this.state.selectedSlot.id,guest_name:this.state.guestName.trim(),guest_email:this.state.guestEmail.trim(),success_url:`${location.origin}${location.pathname}?widget_status=success`,cancel_url:`${location.origin}${location.pathname}?widget_status=cancelled`})});if(t.checkout_url)location.href=t.checkout_url;else throw new Error("No checkout URL returned")}catch(t){this.state.error=t instanceof Error?t.message:"Checkout failed",this.state.step="checkout",this.state.loading=!1,this.render()}}}styles(){const t=this.state.theme,e=t.primaryColor??"#0ea5e9",s=t.backgroundColor??"#ffffff",a=t.textColor??"#0f172a",o=(t.borderRadius??"8")+"px";return`
      :host { all: initial; }
      .np {
        font-family: ${t.fontFamily??"system-ui, -apple-system, sans-serif"};
        color: ${a};
        background: ${s};
        border-radius: ${o};
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
        border-radius: ${o};
        padding: 12px;
        cursor: pointer;
        background: ${s};
        transition: all 0.15s;
      }
      .np-card:hover { border-color: ${e}; transform: translateY(-1px); }
      .np-card.selected { border-color: ${e}; box-shadow: 0 0 0 2px ${e}33; }
      .np-card img { width: 100%; height: 100px; object-fit: cover; border-radius: ${o}; margin-bottom: 8px; }
      .np-name { font-weight: 600; font-size: 14px; margin: 0 0 4px; }
      .np-meta { font-size: 12px; opacity: 0.7; }
      .np-btn {
        background: ${e};
        color: white;
        border: none;
        border-radius: ${o};
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      .np-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .np-btn-ghost { background: transparent; color: ${a}; border: 1px solid rgba(0,0,0,0.15); }
      .np-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .np-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: ${o};
        font-size: 14px;
        font-family: inherit;
        background: ${s};
        color: ${a};
      }
      .np-label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; margin-top: 12px; }
      .np-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px; }
      .np-slot {
        padding: 8px;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: ${o};
        font-size: 13px;
        cursor: pointer;
        text-align: center;
        background: ${s};
        color: ${a};
        font-family: inherit;
      }
      .np-slot:hover { border-color: ${e}; }
      .np-slot.selected { background: ${e}; color: white; border-color: ${e}; }
      .np-error { color: #dc2626; font-size: 13px; margin: 8px 0; }
      .np-loading { padding: 24px; text-align: center; opacity: 0.6; }
      .np-back { background: none; border: none; color: ${e}; cursor: pointer; padding: 0; font-size: 13px; margin-bottom: 8px; font-family: inherit; }
      .np-footer { font-size: 11px; opacity: 0.5; text-align: center; margin-top: 12px; }
    `}render(){var s,a,o,n,d,c,r;const t=this.state;let e="";t.loading&&!t.venue?e='<div class="np-loading">Loading…</div>':t.error&&!t.venue?e=`<div class="np-error">${t.error}</div>`:t.step==="courts"?e=`
        <div class="np-header">
          <h2 class="np-title">${((s=t.venue)==null?void 0:s.name)??""}</h2>
          <p class="np-sub">Select a court to book</p>
        </div>
        <div class="np-grid">
          ${t.courts.map(i=>{var l;return`
            <div class="np-card ${((l=t.selectedCourt)==null?void 0:l.id)===i.id?"selected":""}" data-court="${i.id}">
              ${i.photo_url?`<img src="${i.photo_url}" alt="">`:""}
              <p class="np-name">${i.name}</p>
              <p class="np-meta">$${i.hourly_rate}/hr · ${i.is_indoor?"Indoor":"Outdoor"}</p>
            </div>
          `}).join("")}
        </div>
      `:t.step==="slots"?e=`
        <button class="np-back" data-action="back-courts">← Back to courts</button>
        <div class="np-header">
          <h2 class="np-title">${(a=t.selectedCourt)==null?void 0:a.name}</h2>
          <p class="np-sub">$${(o=t.selectedCourt)==null?void 0:o.hourly_rate}/hr</p>
        </div>
        <label class="np-label">Date</label>
        <input class="np-input" type="date" value="${t.selectedDate}" data-action="date" min="${new Date().toISOString().slice(0,10)}">
        <label class="np-label">Available times</label>
        ${t.loading?'<div class="np-loading">Loading…</div>':t.slots.length===0?'<p class="np-meta">No slots available for this date.</p>':`
          <div class="np-slots">
            ${t.slots.map(i=>{var l;return`
              <button class="np-slot ${((l=t.selectedSlot)==null?void 0:l.id)===i.id?"selected":""}" data-slot="${i.id}">
                ${i.start_time.slice(0,5)}
              </button>
            `}).join("")}
          </div>
        `}
        ${t.selectedSlot?'<div style="margin-top:16px"><button class="np-btn" data-action="continue">Continue</button></div>':""}
      `:(t.step==="checkout"||t.step==="redirecting")&&(e=`
        <button class="np-back" data-action="back-slots">← Back</button>
        <div class="np-header">
          <h2 class="np-title">Confirm booking</h2>
          <p class="np-sub">${(n=t.selectedCourt)==null?void 0:n.name} · ${t.selectedDate} · ${(d=t.selectedSlot)==null?void 0:d.start_time.slice(0,5)}–${(c=t.selectedSlot)==null?void 0:c.end_time.slice(0,5)}</p>
        </div>
        <label class="np-label">Full name</label>
        <input class="np-input" data-action="name" value="${t.guestName}" placeholder="Jane Doe">
        <label class="np-label">Email</label>
        <input class="np-input" data-action="email" type="email" value="${t.guestEmail}" placeholder="jane@example.com">
        ${t.error?`<div class="np-error">${t.error}</div>`:""}
        <div style="margin-top:16px">
          <button class="np-btn" data-action="checkout" ${t.loading?"disabled":""}>
            ${t.loading?"Redirecting…":`Pay $${(r=t.selectedCourt)==null?void 0:r.hourly_rate}`}
          </button>
        </div>
      `),this.root.innerHTML=`<style>${this.styles()}</style><div class="np">${e}<div class="np-footer">Powered by NextPlay</div></div>`,this.bind()}bind(){this.root.querySelectorAll("[data-court]").forEach(r=>{r.onclick=()=>{const i=r.dataset.court;this.state.selectedCourt=this.state.courts.find(l=>l.id===i),this.state.step="slots",this.state.selectedSlot=void 0,this.render(),this.loadSlots()}}),this.root.querySelectorAll("[data-slot]").forEach(r=>{r.onclick=()=>{this.state.selectedSlot=this.state.slots.find(i=>i.id===r.dataset.slot),this.render()}});const t=r=>this.root.querySelector(`[data-action="${r}"]`),e=t("date");e&&(e.onchange=()=>{this.state.selectedDate=e.value,this.loadSlots()});const s=t("back-courts");s&&(s.onclick=()=>{this.state.step="courts",this.state.selectedSlot=void 0,this.render()});const a=t("back-slots");a&&(a.onclick=()=>{this.state.step="slots",this.state.error=void 0,this.render()});const o=t("continue");o&&(o.onclick=()=>{this.state.step="checkout",this.render()});const n=t("name");n&&(n.oninput=()=>{this.state.guestName=n.value});const d=t("email");d&&(d.oninput=()=>{this.state.guestEmail=d.value});const c=t("checkout");c&&(c.onclick=()=>void this.handleCheckout())}}const p={init(h){return new g(h)}};return window.NextPlayWidget=p,p}();
