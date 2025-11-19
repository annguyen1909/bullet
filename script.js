const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const bulletEl = $("#bullet");
const styleEl = $("#style");
const buttonEl = $("#improveBtn");
const statusEl = $("#status");
const errorEl = $("#error");
const resultsEl = $("#results");
const resultsListEl = $("#resultsList");
const resultsPanelEl = document.querySelector("#resultsPanel");
const btnLabelEl = document.querySelector("#improveBtn .btn-label");
const spinnerEl = document.querySelector("#improveSpinner");

function track(eventName, props = {}) {
  try {
    if (window.plausible) {
      window.plausible(eventName, { props });
    }
    if (window.gtag) {
      window.gtag('event', eventName, props);
    }
  } catch {}
}

function setLoading(loading) {
  if (loading) {
    buttonEl.disabled = true;
    if (btnLabelEl) btnLabelEl.textContent = "Improving…";
    if (spinnerEl) { spinnerEl.style.display = "inline-block"; try { spinnerEl.play(); } catch {} }
    statusEl.textContent = "Calling the model and polishing phrasing…";
    errorEl.hidden = true;
  } else {
    buttonEl.disabled = false;
    if (btnLabelEl) btnLabelEl.textContent = "Improve Bullet";
    if (spinnerEl) { spinnerEl.style.display = "none"; try { spinnerEl.stop(); } catch {} }
    statusEl.textContent = "";
  }
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function clearResults() {
  resultsListEl.innerHTML = "";
  resultsEl.hidden = true;
  if (resultsPanelEl) resultsPanelEl.hidden = true;
}

function renderResults(results) {
  clearResults();
  results.forEach((text, i) => {
    const li = document.createElement("li");
    li.className = "result-item";

    const span = document.createElement("div");
    span.className = "bullet-text";
    span.textContent = text;

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied!";
        track('copy_bullet', { index: i + 1 });
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      } catch {
        btn.textContent = "Copy failed";
        track('copy_failed', { index: i + 1 });
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    resultsListEl.appendChild(li);
  });
  resultsEl.hidden = false;
  if (resultsPanelEl) resultsPanelEl.hidden = false;
}

async function improve() {
  clearResults();
  errorEl.hidden = true;
  const bullet = bulletEl.value.trim();
  const style = styleEl.value;

  if (!bullet) {
    showError("Please enter a resume bullet to improve.");
    return;
  }

  track('improve_click', { style });
  setLoading(true);
  try {
    const res = await fetch("/api/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bullet, style }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.results)) {
      throw new Error("Malformed response from server.");
    }
    track('results_shown', { count: data.results.length });
    renderResults(data.results);
  } catch (e) {
    showError(e.message || "Something went wrong.");
    track('improve_error', { message: (e && e.message) || 'unknown' });
  } finally {
    setLoading(false);
  }
}

buttonEl.addEventListener("click", improve);

// Convenience: Ctrl/Cmd+Enter triggers improve
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    improve();
  }
});

// Delegate copy tracking in renderResults via mutation observer of clicks? The copy buttons are bound inline there.
