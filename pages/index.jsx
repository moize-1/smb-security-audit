import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * SMB Security Copilot – Chat-style MVP (Next.js + React, **pure JavaScript**)
 *
 * This version removes all TypeScript so it builds cleanly with only
 * next/react/react-dom. Drop into `pages/index.jsx`.
 */

// -------------------------------
// Helpers
// -------------------------------
function withSubId(baseUrl, subId) {
  try {
    const url = new URL(baseUrl);
    if (subId) url.searchParams.set("subId", subId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// -------------------------------
// Affiliate catalog (replace URLs)
// -------------------------------
const AFFILIATE = {
  passwordManager: [
    { name: "1Password Business", url: "https://example.affinex.link/1password", blurb: "Best overall for SMBs; shared vaults, policies.", affiliate: true },
    { name: "Dashlane Business", url: "https://example.affinex.link/dashlane", blurb: "Great admin console & SSO.", affiliate: true },
  ],
  endpoint: [
    { name: "Bitdefender GravityZone", url: "https://example.affinex.link/bitdefender", blurb: "Strong protection, light agent.", affiliate: true },
    { name: "Malwarebytes for Teams", url: "https://example.affinex.link/malwarebytes", blurb: "Simple & effective for small teams.", affiliate: true },
  ],
  backup: [
    { name: "Backblaze Business Backup", url: "https://example.affinex.link/backblaze", blurb: "Automated offsite backups.", affiliate: true },
    { name: "Acronis Cyber Protect", url: "https://example.affinex.link/acronis", blurb: "Image backup + cyber protection.", affiliate: true },
  ],
  vpn: [
    { name: "NordLayer (NordVPN Teams)", url: "https://example.affinex.link/nordvpn", blurb: "Business VPN + secure access.", affiliate: true },
    { name: "Surfshark One Business", url: "https://example.affinex.link/surfshark", blurb: "Budget-friendly remote security.", affiliate: true },
  ],
  emailSecurity: [
    { name: "TitanHQ (SpamTitan)", url: "https://www.titanhq.com/spamtitan/", blurb: "Layered email security for M365/Workspace." },
    { name: "Barracuda Email Protection", url: "https://www.barracuda.com/products/email-protection", blurb: "Inbound filtering + ATO protection." },
  ],
  mfa: [
    { name: "Microsoft Entra ID (MFA)", url: "https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-getstarted", blurb: "Built-in MFA for M365." },
    { name: "Google Workspace 2‑Step", url: "https://support.google.com/a/answer/175197", blurb: "Force org-wide 2‑Step Verification." },
    { name: "Duo MFA", url: "https://duo.com/product/multi-factor-authentication-mfa", blurb: "Flexible across many apps." },
  ],
  mdm: [
    { name: "Microsoft Intune (MDM)", url: "https://www.microsoft.com/en-us/security/business/microsoft-intune", blurb: "Device compliance & policies." },
    { name: "Kandji (Apple)", url: "https://www.kandji.io/", blurb: "Great for Mac fleets." },
  ],
};

// -------------------------------
// Questions (conversational flow)
// -------------------------------
const QUESTIONS = [
  { key: "employees", label: "How many employees do you have?", options: ["1", "2-5", "6-15", "16-50", "51-200", "200+"] },
  { key: "suite", label: "Primary work suite?", options: ["Microsoft 365", "Google Workspace", "Both/Other"] },
  { key: "mfa", label: "Is MFA enforced for all accounts?", options: ["All users", "Some users", "Not enforced"] },
  { key: "pwdmgr", label: "Team password manager in use?", options: ["Yes", "No"] },
  { key: "endpoint", label: "Endpoint protection (EDR/AV) on all devices?", options: ["All devices", "Some devices", "No"] },
  { key: "backup", label: "Automated, offsite backups for important data?", options: ["Yes", "No"] },
  { key: "emailsec", label: "Extra email security beyond built‑in?", options: ["Yes", "No"] },
  { key: "remote", label: "How many remote workers?", options: ["None", "Some", "Many/Most"] },
  { key: "mdm", label: "Do you use MDM/device management (Intune/Jamf/etc.)?", options: ["Yes", "Partial", "No"] },
  { key: "pii", label: "Do you process payments or store customer PII?", options: ["Yes", "No"] },
];

// -------------------------------
// Risk engine (pure JS)
// -------------------------------
function computePlan(a) {
  let risk = 0;
  const steps = [];
  const manyUsers = ["6-15", "16-50", "51-200", "200+"].includes(a.employees);

  if (a.mfa !== "All users") {
    risk += 3;
    steps.push({
      id: "mfa",
      title: "Enforce MFA for all accounts",
      why: "Stops most account-takeover attacks.",
      how: [
        a.suite === "Microsoft 365"
          ? "Use Conditional Access in Entra ID to require MFA for all users."
          : a.suite === "Google Workspace"
          ? "Turn on 2‑Step Verification for all users in Admin console."
          : "Use Duo to enforce MFA across various apps.",
      ],
      category: "mfa",
      impact: 5,
      effort: "Low",
    });
  }

  if (a.pwdmgr !== "Yes") {
    risk += 2;
    steps.push({
      id: "pwdmgr",
      title: "Adopt a team password manager",
      why: "Reduces weak/reused passwords and enables secure sharing.",
      how: ["Create shared vaults; require strong, unique passwords; enable SSO if available."],
      category: "passwordManager",
      impact: 4,
      effort: "Low",
    });
  }

  if (a.endpoint !== "All devices") {
    risk += 2;
    steps.push({
      id: "endpoint",
      title: "Deploy endpoint protection on all devices",
      why: "Blocks malware/ransomware before it spreads.",
      how: ["Roll out a single EDR/AV to all endpoints and monitor alerts weekly."],
      category: "endpoint",
      impact: 4,
      effort: a.endpoint === "No" ? "Medium" : "Low",
    });
  }

  if (a.backup !== "Yes") {
    risk += 3;
    steps.push({
      id: "backup",
      title: "Enable automated, offsite backups",
      why: "Protects from ransomware, device loss, and accidental deletion.",
      how: ["Back up laptops/desktops daily and test restores quarterly."],
      category: "backup",
      impact: 5,
      effort: "Medium",
    });
  }

  if (a.emailsec !== "Yes") {
    risk += 1;
    steps.push({
      id: "email",
      title: "Add advanced email security",
      why: "Catches phishing and malicious attachments that defaults miss.",
      how: [
        a.suite === "Microsoft 365"
          ? "Add advanced phishing protection on top of Defender (or third‑party gateway)."
          : a.suite === "Google Workspace"
          ? "Layer a secure email gateway to improve phishing detection."
          : "Add a secure email gateway to your mail provider.",
      ],
      category: "emailSecurity",
      impact: 3,
      effort: "Low",
    });
  }

  if (["Some", "Many/Most"].includes(a.remote)) {
    risk += 1;
    steps.push({
      id: "vpn",
      title: "Provide secure remote access (VPN/ZTNA)",
      why: "Encrypts traffic on untrusted networks and limits exposure.",
      how: ["Issue accounts to remote staff; restrict access by user/group."],
      category: "vpn",
      impact: 3,
      effort: "Low",
    });
  }

  if (a.mdm === "No" && manyUsers) {
    risk += 1;
    steps.push({
      id: "mdm",
      title: "Set up device management (MDM)",
      why: "Keeps devices patched, enforces disk encryption, allows remote wipe.",
      how: ["Enroll corporate devices; enforce screen lock, updates and encryption."],
      category: "mdm",
      impact: 3,
      effort: "Medium",
    });
  }

  const effortRank = { Low: 0, Medium: 1, High: 2 };
  steps.sort((x, y) => y.impact - x.impact || effortRank[x.effort] - effortRank[y.effort]);
  const score = Math.max(0, 100 - risk * 8);
  return { score, steps: steps.slice(0, 5) };
}

// -------------------------------
// UI helpers (Tailwind classes are optional; site יעבוד גם בלי Tailwind)
// -------------------------------
function Label({ children }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}
function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

// -------------------------------
// Page – chat style
// -------------------------------
export default function ChatAudit() {
  const [subId, setSubId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [msgs, setMsgs] = useState([
    { role: "bot", html: "Hi! I’ll help you build a quick SMB security plan. Ready to start?" },
  ]);
  const [typing, setTyping] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sid = new URLSearchParams(window.location.search).get("subId");
      if (sid) setSubId(sid);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [msgs, typing, showPlan]);

  const complete = QUESTIONS.every(q => !!answers[q.key]);
  const plan = useMemo(() => (complete ? computePlan(answers) : null), [complete, answers]);

  function pushBot(html) { setMsgs(m => [...m, { role: "bot", html }]); }
  function pushUser(html) { setMsgs(m => [...m, { role: "user", html }]); }

  function onAnswer(value) {
    const q = QUESTIONS[currentQ];
    setAnswers(prev => ({ ...prev, [q.key]: value }));
    pushUser(`<b>${q.label}</b><br/>${value}`);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (currentQ < QUESTIONS.length - 1) {
        const nextIndex = currentQ + 1;
        setCurrentQ(nextIndex);
        pushBot(QUESTIONS[nextIndex].label);
      } else {
        pushBot("Great — generating your prioritized plan…");
        setShowPlan(true);
        if (typeof window !== "undefined") window.dataLayer?.push?.({ event: "view_plan" });
      }
    }, 400);
  }

  useEffect(() => { if (msgs.length === 1) pushBot(QUESTIONS[0].label); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 flex items-center justify-center font-bold text-blue-700">S"C</div>
          <span className="font-semibold">SMB Security Copilot</span>
        </div>
        <div className="text-xs text-gray-500">We may earn a commission from recommended tools.</div>
      </header>

      {/* Chat window */}
      <main className="max-w-4xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div ref={scrollRef} className="h-[60vh] overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"} max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow`}
                  dangerouslySetInnerHTML={{ __html: m.html }}
                />
              </div>
            ))}
            {typing && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-2 text-sm shadow animate-pulse">…typing</div>
              </div>
            )}

            {showPlan && plan && (
              <div className="mt-4">
                <div className="mb-3 flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-2xl px-4 py-2 text-sm shadow">
                    Here’s your plan. Work top to bottom for fastest risk reduction.
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">Prioritized Security Plan</div>
                    <div className="rounded-xl bg-blue-50 px-3 py-1 text-blue-700 text-xs font-medium">Score: {plan.score}/100</div>
                  </div>

                  <ol className="mt-3 space-y-3">
                    {plan.steps.map((s, i) => (
                      <li key={s.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium">{i + 1}. {s.title}</div>
                            <div className="mt-1 text-sm text-gray-600">Why: {s.why}</div>
                            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                              {s.how.map((h, idx) => <li key={idx}>{h}</li>)}
                            </ul>
                            {s.category && (
                              <div className="mt-3">
                                <div className="text-sm font-medium">Vetted tool options</div>
                                <div className="mt-2 grid md:grid-cols-2 gap-3">
                                  {(AFFILIATE[s.category] || []).map(opt => (
                                    <a
                                      key={opt.name}
                                      href={withSubId(opt.url, subId)}
                                      target="_blank" rel="noopener noreferrer"
                                      onClick={() => { if (typeof window !== "undefined") window.dataLayer?.push?.({ event: "affiliate_click", category: s.category, vendor: opt.name }); }}
                                      className="group rounded-xl border p-3 hover:border-blue-600 hover:shadow"
                                    >
                                      <div className="font-medium group-hover:text-blue-700">{opt.name}</div>
                                      <div className="text-sm text-gray-600">{opt.blurb}</div>
                                      <div className="mt-2 inline-flex items-center gap-2 text-xs">
                                        <span className="rounded-md bg-gray-100 px-2 py-1">{opt.affiliate ? "Affiliate" : "External"}</span>
                                        <span className="text-gray-400">→</span>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1 text-[10px] text-gray-700">
                              <span>Impact</span>
                              <span className="font-semibold">{"★".repeat(s.impact)}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-gray-500">Effort: {s.effort}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-3 text-[12px] text-gray-500">Disclaimer: General guidance only; tailor to your environment.</div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          {!showPlan && (
            <div className="border-t bg-gray-50 p-3">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <select
                  className="flex-1 rounded-xl border-gray-300 focus:border-blue-600 focus:ring-blue-600 px-3 py-2"
                  value={answers[QUESTIONS[currentQ].key] || ""}
                  onChange={(e) => onAnswer(e.target.value)}
                >
                  <option value="" disabled>{QUESTIONS[currentQ].label}</option>
                  {QUESTIONS[currentQ].options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  onClick={() => { if (typeof window !== "undefined") window.dataLayer?.push?.({ event: "start_audit" }); }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white font-medium shadow hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">We don’t store your answers. They stay in your browser.</div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SMB Security Copilot · Affiliate disclosure: we may earn commissions if you purchase via our links.
      </footer>
    </div>
  );
}
