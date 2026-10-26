// ==UserScript==
// @name         ORBIT Audit Hub - Tool Invoked Badge
// @namespace    orbit-gamma.harmony
// @version      1.3
// @description  Shows Tool Invoked name in red on sidebar; flags negative feedback on annotation column. Appends "- CS" for out-of-scope responses that redirect to customer support.
// @match        https://orbit-audit-hub.beta.harmony.a2z.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function isAuditHub() {
    return !!document.getElementById("chat-display");
  }

  var BADGE_CLASS = "audit-hub-tool-badge";

  var CS_REDIRECT_PHRASES = [
    "contact support for help",
    "contact amazon business support"
  ];

  function isCsRedirect(redirectText) {
    var lower = redirectText.toLowerCase();
    for (var i = 0; i < CS_REDIRECT_PHRASES.length; i++) {
      if (lower.indexOf(CS_REDIRECT_PHRASES[i]) !== -1) return true;
    }
    return false;
  }

  function extractMetaValue(msgEl, label) {
    var metaLines = msgEl.querySelectorAll(".meta-line");
    for (var i = 0; i < metaLines.length; i++) {
      var strong = metaLines[i].querySelector("strong");
      if (strong && strong.textContent.trim() === label) {
        return metaLines[i].textContent.replace(label, "").trim();
      }
    }
    return null;
  }

  function extractToolLabel(msgEl) {
    var tool = extractMetaValue(msgEl, "Tool Invoked:");
    if (!tool) return null;

    var isOutOfScope =
      tool === "Tool Out of Scope" || tool === "Out Of Scope";

    if (isOutOfScope) {
      var redirect = extractMetaValue(msgEl, "Customer Redirect:");
      if (redirect && isCsRedirect(redirect)) {
        return tool + " - CS";
      }
    }

    return tool;
  }

  function getToolForSelected() {
    var selected = document.querySelector(".message.customer.selected");
    if (!selected) return null;
    var next = selected.nextElementSibling;
    while (next) {
      if (next.classList.contains("bot")) return extractToolLabel(next);
      next = next.nextElementSibling;
    }
    return null;
  }

  function getToolLabels() {
    var result = [];
    var labels = document.querySelectorAll(".form-label");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.indexOf("Tool Invoked Accurate") !== -1) {
        result.push(labels[i]);
      }
    }
    return result;
  }

  function updateBadges() {
    if (!isAuditHub()) return;
    var toolLabels = getToolLabels();
    if (!toolLabels.length) return;
    var tool = getToolForSelected();
    for (var k = 0; k < toolLabels.length; k++) {
      var lbl = toolLabels[k];
      var badge = lbl.querySelector("." + BADGE_CLASS);
      if (!badge) {
        badge = document.createElement("span");
        badge.className = BADGE_CLASS;
        badge.style.cssText = "color:red;font-size:11px;font-weight:normal;margin-left:8px;vertical-align:middle;display:none;";
        lbl.appendChild(badge);
      }
      badge.textContent = tool || "";
      badge.style.display = tool ? "inline" : "none";
    }
  }

  // ─── Negative feedback badge ─────────────────────────────────────────────

  var NEG_BADGE_CLASS = "audit-hub-neg-badge";

  function getNegFeedbackLabels() {
    var result = [];
    var labels = document.querySelectorAll(".form-label");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.indexOf("Negative Customer Feedback Classification") !== -1) {
        result.push(labels[i]);
      }
    }
    return result;
  }

  function updateNegBadges() {
    if (!isAuditHub()) return;
    var negLabels = getNegFeedbackLabels();
    if (!negLabels.length) return;

    var selected = document.querySelector(".message.customer.selected");
    var isNeg = selected && selected.querySelector(".feedback-negative") !== null;

    for (var k = 0; k < negLabels.length; k++) {
      var lbl = negLabels[k];
      var badge = lbl.querySelector("." + NEG_BADGE_CLASS);
      if (!badge) {
        badge = document.createElement("span");
        badge.className = NEG_BADGE_CLASS;
        badge.style.cssText = "color:red;font-size:11px;font-weight:normal;margin-left:8px;vertical-align:middle;display:none;";
        lbl.appendChild(badge);
      }
      badge.textContent = isNeg ? "Negative marked" : "";
      badge.style.display = isNeg ? "inline" : "none";
    }
  }

  // ─── Tool Accurate highlight ─────────────────────────────────────────────

  // When a tool was invoked AND the auditor marked it Accurate,
  // highlight the readonly "Accurate" value in green.
  function updateToolAccurateHighlight() {
    if (!isAuditHub()) return;

    var readonlyVal = document.getElementById("readonly-tool-accurate");
    if (!readonlyVal) return;

    var tool = getToolForSelected();
    var isAccurate = readonlyVal.textContent.trim() === "Accurate";

    if (tool && isAccurate) {
      readonlyVal.style.cssText = "color:#fff;background:#dc2626;padding:1px 7px;border-radius:4px;font-weight:600;display:inline-block;";
    } else {
      readonlyVal.style.cssText = "";
    }
  }

  // ─── Negative Feedback Classification highlight ───────────────────────────

  // When the message is negatively marked AND the classification is anything
  // other than N/A or Human Evaluator - Cannot Judge, highlight it in red.
  var NEG_HIGHLIGHT_EXEMPT = ["N/A", "Human Evaluator - Cannot Judge", ""];

  function updateNegFeedbackHighlight() {
    if (!isAuditHub()) return;

    var readonlyVal = document.getElementById("readonly-neg-feedback");
    if (!readonlyVal) return;

    var selected = document.querySelector(".message.customer.selected");
    var isNeg = selected && selected.querySelector(".feedback-negative") !== null;
    var classification = readonlyVal.textContent.trim();
    var isExempt = NEG_HIGHLIGHT_EXEMPT.indexOf(classification) !== -1;

    if (isNeg && !isExempt) {
      readonlyVal.style.cssText = "color:#fff;background:#dc2626;padding:1px 7px;border-radius:4px;font-weight:600;display:inline-block;";
    } else {
      readonlyVal.style.cssText = "";
    }
  }

  // ─── Observers ────────────────────────────────────────────────────────────

  var debounceTimer = null;
  new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { updateBadges(); updateNegBadges(); updateToolAccurateHighlight(); updateNegFeedbackHighlight(); }, 120);
  }).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  function attachChatObserver() {
    var chat = document.getElementById("chat-display");
    if (!chat || chat.dataset.auditBadgeObserved) return;
    chat.dataset.auditBadgeObserved = "1";
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var t = mutations[i].target;
        if (t.classList && t.classList.contains("customer")) {
          updateBadges();
          updateNegBadges();
          updateToolAccurateHighlight();
          updateNegFeedbackHighlight();
          return;
        }
      }
    }).observe(chat, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    if (!isAuditHub()) return;
    updateBadges();
    updateNegBadges();
    updateToolAccurateHighlight();
    updateNegFeedbackHighlight();
    attachChatObserver();
  }

  init();

})();
