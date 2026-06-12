export function createAvatarOverlay({ maps, employee, pos, map, openPanel, openHistory, bwMode, moving, labels = {} }) {
  const lastKnownLocationLabel = labels.lastKnownLocation || "Last known location";
  const historyLabel = labels.history || "History";
  class AvatarOverlay extends maps.OverlayView {
    constructor() {
      super();
      this.employee = employee;
      this.position = pos;
      this.div = null;
    }
    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.transform = "translate(-50%,-50%)";
      this.div.style.pointerEvents = "auto";

      const size = 48;
      const border = 4;

      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.width = `${size}px`;
      container.style.height = `${size}px`;

      const ping = document.createElement("div");
      ping.className = "avatar-ping";
      ping.style.position = "absolute";
      ping.style.left = `-${border}px`;
      ping.style.top = `-${border}px`;
      ping.style.width = `${size + border * 2}px`;
      ping.style.height = `${size + border * 2}px`;
      ping.style.borderRadius = "50%";
      ping.style.pointerEvents = "none";

      const avatarWrap = document.createElement("div");
      avatarWrap.style.width = `${size}px`;
      avatarWrap.style.height = `${size}px`;
      avatarWrap.style.borderRadius = "50%";
      avatarWrap.style.overflow = "hidden";
      avatarWrap.style.boxSizing = "border-box";
      avatarWrap.style.border = "4px solid #1152d4";
      avatarWrap.style.boxShadow = "0 6px 18px rgba(2,6,23,0.6)";
      avatarWrap.className = "avatar-wrap";

      const img = document.createElement("img");
      img.src = this.employee.avatar || "";
      img.alt = this.employee.name || "";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.draggable = false;

      avatarWrap.appendChild(img);
      container.appendChild(ping);
      container.appendChild(avatarWrap);

      const tooltip = document.createElement("div");
      tooltip.className = "pin-tooltip";
      tooltip.style.position = "absolute";
      tooltip.style.bottom = "100%";
      tooltip.style.left = "50%";
      tooltip.style.transform = "translate(-50%,8px)";
      tooltip.style.pointerEvents = "none";
      tooltip.style.opacity = "0";
      tooltip.style.transition = "opacity 0.10s, transform 0.18s";

        // Start ping animation for 5 seconds
        ping.style.background = "rgba(17,82,212,0.4)";
        ping.style.animation = "ping 1s cubic-bezier(0,0,0.2,1) infinite";
        setTimeout(() => {
          ping.style.animation = "";
          ping.style.background = "transparent";
        }, 5000);
      // Compact horizontal card — small avatar on the left, name + subtitle + timestamp on the right
      const glass = document.createElement("div");
      glass.className = "glass-panel rounded-xl shadow-2xl";
      glass.style.display = "flex";
      glass.style.alignItems = "center";
      glass.style.gap = "10px";
      glass.style.padding = "10px 14px";
      glass.style.background = "rgba(15,23,42,0.92)";
      glass.style.border = "1px solid rgba(148,163,184,0.15)";
      glass.style.fontSize = "12px";
      glass.style.whiteSpace = "nowrap";

      const thumbWrap = document.createElement("div");
      thumbWrap.style.width = "44px";
      thumbWrap.style.height = "44px";
      thumbWrap.style.borderRadius = "10px";
      thumbWrap.style.overflow = "hidden";
      thumbWrap.style.flexShrink = "0";
      thumbWrap.style.background = "#334155";
      const thumbImg = document.createElement("img");
      thumbImg.src = this.employee.avatar || "";
      thumbImg.alt = this.employee.name || "";
      thumbImg.style.width = "100%";
      thumbImg.style.height = "100%";
      thumbImg.style.objectFit = "cover";
      thumbWrap.appendChild(thumbImg);

      const textBlk = document.createElement("div");
      textBlk.style.display = "flex";
      textBlk.style.flexDirection = "column";
      textBlk.style.lineHeight = "1.3";

      const nameEl = document.createElement("div");
      nameEl.style.fontWeight = "600";
      nameEl.style.color = "white";
      nameEl.style.fontSize = "13px";
      nameEl.textContent = this.employee.name || "";

      const subEl = document.createElement("div");
      subEl.style.color = "#94a3b8";
      subEl.style.fontSize = "11px";
      subEl.textContent = this.employee.location || lastKnownLocationLabel;

      textBlk.appendChild(nameEl);
      textBlk.appendChild(subEl);

      if (this.employee.timestamp) {
        const timeEl = document.createElement("div");
        timeEl.style.color = "#64748b";
        timeEl.style.fontSize = "11px";
        timeEl.style.marginTop = "2px";
        const d = new Date(this.employee.timestamp);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          timeEl.textContent =
            d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
            " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
        } else {
          timeEl.textContent = String(this.employee.timestamp);
        }
        textBlk.appendChild(timeEl);
      }

      glass.appendChild(thumbWrap);
      glass.appendChild(textBlk);

      // "View History" button
      const historyBtn = document.createElement("button");
      historyBtn.textContent = historyLabel;
      historyBtn.style.marginLeft = "10px";
      historyBtn.style.background = "#3b82f6";
      historyBtn.style.color = "white";
      historyBtn.style.border = "0";
      historyBtn.style.borderRadius = "6px";
      historyBtn.style.padding = "6px 10px";
      historyBtn.style.fontSize = "11px";
      historyBtn.style.fontWeight = "600";
      historyBtn.style.cursor = "pointer";
      historyBtn.style.flexShrink = "0";
      historyBtn.style.pointerEvents = "auto";
      historyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        try {
          if (typeof openHistory === "function") openHistory(this.employee);
        } catch (err) {}
      });
      historyBtn.addEventListener("mouseenter", () => {
        historyBtn.style.background = "#2563eb";
      });
      historyBtn.addEventListener("mouseleave", () => {
        historyBtn.style.background = "#3b82f6";
      });
      glass.appendChild(historyBtn);

      tooltip.appendChild(glass);

      // Tooltip stays interactive so the button is clickable
      tooltip.style.pointerEvents = "auto";

      this.div.appendChild(container);
      this.div.appendChild(tooltip);

      this.tooltipEl = tooltip;
      this.pingEl = ping;
      this.avatarWrap = avatarWrap;

      this.div.addEventListener("click", (e) => {
        e.stopPropagation();
        try {
          openPanel(this.employee);
        } catch (err) {}
      });

      this.div.addEventListener("mouseenter", () => {
        if (this.tooltipEl) {
          this.tooltipEl.style.opacity = "1";
          this.tooltipEl.style.transform = "translate(-50%,0)";
          this.tooltipEl.style.pointerEvents = "auto";
        }
      });
      this.div.addEventListener("mouseleave", () => {
        if (this.tooltipEl) {
          this.tooltipEl.style.opacity = "0";
          this.tooltipEl.style.transform = "translate(-50%,8px)";
          this.tooltipEl.style.pointerEvents = "none";
        }
      });

      this.getPanes().overlayMouseTarget.appendChild(this.div);
    }
    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new maps.LatLng(this.position.lat, this.position.lng),
      );
      if (point) {
        this.div.style.left = `${point.x}px`;
        this.div.style.top = `${point.y}px`;
      }
    }
    onRemove() {
      if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
      this.div = null;
      this.pingEl = null;
      this.avatarWrap = null;
    }
    setPosition(p) {
      this.position = p;
      try {
        this.draw();
      } catch (e) {}
    }
    setMoving(flag) {
      if (!this.pingEl || !this.avatarWrap) return;
      if (flag) {
        this.pingEl.style.background = "rgba(17,82,212,0.4)";
        this.pingEl.style.animation = "ping 1.5s cubic-bezier(0,0,0.2,1) infinite";
        this.avatarWrap.style.borderColor = "#1fb5ff";
      } else {
        this.pingEl.style.animation = "";
        this.pingEl.style.background = "transparent";
        this.avatarWrap.style.borderColor = "#1152d4";
      }
    }
    setBW(flag) {
      // Do nothing: avatars should always remain colorful, bwMode only affects map background
    }
  }

  const overlay = new AvatarOverlay();
  overlay.setMap(map);
  overlay.setMoving(Boolean(moving));
  overlay.setBW(Boolean(bwMode));
  return overlay;
}