import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * SMB Security Copilot – ChatGPT-like UI (Pure JS + styled-jsx)
 * - No TypeScript, no Tailwind. Single file.
 * - Dark theme, chat bubbles, typing indicator, sticky composer.
 * - SubId passthrough + basic dataLayer events.
 */

// ---------- helpers ----------
function withSubId(baseUrl, subId) {
  try {
    const url = new URL(baseUrl);
    if (subId) url.searchParams.set("subId", subId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// ---------- affiliate catalog (replace URLs) ----------
const AFFILIATE = {
  passwordManager: [
    { name: "1Password Business", url: "https://example.affinex.link/1password", blurb: "Best overall for SMBs; shared vaults, policies.", affiliate: true },
    { name: "Dashlane Business", url: "https://example.affinex.link/dashlane", blurb: "Great admin console & SSO.", affiliate: true }
  ],
  endpoint: [
    { name: "Bitdefender GravityZone", url: "https://example.affinex.link/bitdefender", blurb: "Strong protection, light agent.", affiliate: true },
    { name: "Malwarebytes for Teams", url: "https://example.affinex.link/malwarebytes", blurb: "Simple & effective for small teams.", affiliate: true }
  ],
  backup: [
    { name: "Backblaze Business Backup", url: "https://example.affinex.link/backblaze", blurb: "Automated offsite backups.", affiliate: true },
    { name: "Acronis Cyber Protect", url: "https://example.affinex.link/acronis", blurb: "Image backup + cyber protection.", affiliate: true }
  ],
  vpn: [
    { name: "NordLayer (NordVPN Teams)", url: "https://example.affinex.link/nordvpn", blurb: "Business VPN + secure access.", affiliate: true },
    { name: "Surfshark One Business", url: "https://example.affinex.link/surfshark", blurb: "Budget-friendly remote security.", affiliate: true }
  ],
  emailSecurity: [
    { name: "TitanHQ (SpamTitan)", url: "https://www.titanhq.com/spamtitan/", blurb: "Layered email security for M365/Workspace." },
    { name: "Barracuda Email Protection", url: "https://www.barracuda.com/products/email-protection", blurb: "Inbound filtering + ATO protection." }
  ],
  mfa: [
    { name: "Microsoft Entra ID (MFA)", url: "https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-getstarted", blurb: "Built-in MFA for M365." },
    { name: "Google Workspace 2-Step", url: "https://support.google.com/a/answer/175197", blurb: "Force org-wide 2-Step Verification." },
    { name: "Duo MFA", url: "https://duo.com/product/multi-factor-authentication-mfa", blurb: "Flexible across many apps." }
  ],
  mdm: [
    { name: "Microsoft Intune (MDM)", url: "https://www.microsoft.com/en-us/security/business/microsoft-intune", blurb: "Device compliance & policies." },
    { name: "Kandji (Apple)", url: "https://www.kandji.io/", blurb: "Great for Mac fleets." }
  ]
};

// ---------- questions (conversational flow) ----------
const QUESTIONS = [
  { key: "employees", label: "How many employees do you have?", options: ["1", "2-5", "6-15", "16-50", "51-200", "200+"] },
  { key: "suite", label: "Primary work suite?", options: ["Microsoft 365", "Google Workspace", "Both/Other"] },
  { key: "mfa", label: "Is MFA enforced for all accounts?", options: ["All users", "Some users", "Not enforced"] },
  { key: "pwdmgr", label: "Team password manager in use?", options: ["Yes", "No"] },
  { key: "endpoint", label: "Endpoint protection (EDR/AV) on all devices?", options: ["All devices", "Some devices", "No"] },
  { key: "backup", label: "Automated, offsite backups for important data?", options: ["Yes", "No"] },
  { key: "emailsec", label: "Extra email security beyond built-in?", options: ["Yes", "No"] },
  { key: "remote", label: "How many remote workers?", options: ["None", "Some", "Many/Most"] },
  { key: "mdm", label: "Do you use MDM/device management (Intune/Jamf/etc.)?", options: ["Yes", "Partial", "No"] },
  { key: "pii", label: "Do you process payments or store customer PII?", options: ["Yes", "No"] }
];

// ---------- risk engine ----------
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
          ? "Turn on 2-Step Verification for all users in Admin console."
          : "Use Duo to enforce MFA across various apps."
      ],
      category: "mfa",
      impact: 5,
      effort: "Low"
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
      effort: "Low"
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
      effort: a.endpoint === "No" ? "Medium" : "Low"
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
      effort: "Medium"
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
          ? "Add advanced phishing protection on top of Defender (or third-party gateway)."
          : a.suite === "Google Workspace"
          ? "Layer a secure email gateway to improve phishing detection."
          : "Add a secure email gateway to your mail provider."
      ],
      category: "emailSecurity",
      impact: 3,
      effort: "Low"
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
      effort: "Low"
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
      effort: "Medium"
    });
  }

  const effortRank = { Low: 0, Medium: 1, High: 2 };
  steps.sort((x, y) => y.impact - x.impact || effortRank[x.effort] - effortRank[y.effort]);
  const score = Math.max(0, 100 - risk * 8);
  return { score, steps: steps.slice(0, 5) };
}

// ---------- page (chat) ----------
export default function ChatLike() {
  const [subId, setSubId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [msgs, setMsgs] = useState([
    { role: "bot", html: "Hi! I’ll help you build a quick SMB security plan. Ready to start?" }
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

  useEffect(() => { if (msgs.length === 1) pushBot(QUESTIONS[0].label); }, []); // first question

  return (
    <div className="gpt">
      {/* header */}
      <header className="header">
        <div className="brand">
          <div className="logo">SC</div>
          <div className="title">SMB Security Copilot</div>
        </div>
        <div className="disclosure">We may earn a commission from recommended tools.</div>
      </header>

      {/* chat area */}
      <main className="main">
        <div className="chat" ref={scrollRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="avatar">{m.role === "bot" ? "🤖" : "🧑"}</div>
              <div className="bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
            </div>
          ))}
          {typing && (
            <div className="message bot">
              <div className="avatar">🤖</div>
              <div className="bubble typing">typing…</div>
            </div>
          )}

          {showPlan && plan && (
            <div className="message bot">
              <div className="avatar">🤖</div>
              <div className="bubble">
                <div className="plan">
                  <div className="plan-head">
                    <div className="plan-title">Prioritized Security Plan</div>
                    <div className="score">Score: {plan.score}/100</div>
                  </div>

                  <ol className="steps">
                    {plan.steps.map((s, i) => (
                      <li key={s.id} className="step">
                        <div className="step-head">
                          <div className="step-title">{i + 1}. {s.title}</div>
                          <div className="impact">{"★".repeat(s.impact)}</div>
                        </div>
                        <div className="why">Why: {s.why}</div>
                        <ul className="how">
                          {s.how.map((h, idx) => <li key={idx}>{h}</li>)}
                        </ul>

                        {s.category && (
                          <div className="vendors">
                            {(AFFILIATE[s.category] || []).map(opt => (
                              <a
                                key={opt.name}
                                className="vendor"
                                href={withSubId(opt.url, subId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => { if (typeof window !== "undefined") window.dataLayer?.push?.({ event: "affiliate_click", category: s.category, vendor: opt.name }); }}
                              >
                                <div className="v-name">{opt.name}</div>
                                <div className="v-blurb">{opt.blurb}</div>
                                <div className="tag">{opt.affiliate ? "Affiliate" : "External"} →</div>
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>

                  <div className="tiny">
                    Disclaimer: General guidance only; tailor to your environment.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* composer */}
        {!showPlan && (
          <div className="composer">
            <div className="row">
              <select
                className="select"
                value={answers[QUESTIONS[currentQ].key] || ""}
                onChange={(e) => onAnswer(e.target.value)}
              >
                <option value="" disabled>{QUESTIONS[currentQ].label}</option>
                {QUESTIONS[currentQ].options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button
                className="send"
                onClick={() => { if (typeof window !== "undefined") window.dataLayer?.push?.({ event: "start_audit" }); }}
              >
                Next
              </button>
            </div>
            <div className="hint">We don’t store your answers. They stay in your browser.</div>
          </div>
        )}
      </main>

      <footer className="foot">© {new Date().getFullYear()} SMB Security Copilot · Affiliate disclosure.</footer>

      {/* -------- global styles (ChatGPT-like) -------- */}
      <style jsx global>{`
        :root{
          --bg:#343541; --panel:#444654; --fg:#ececf1; --muted:#aeb0b4; --accent:#10a37f; --border:rgba(255,255,255,0.08);
          --max: 820px;
        }
        *{box-sizing:border-box}
        html,body,#__next{height:100%}
        body{margin:0;background:var(--bg);color:var(--fg);font:400 16px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial;}
        a{color:inherit;text-decoration:none}
        .gpt .header{max-width:var(--max);margin:0 auto;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
        .brand{display:flex;align-items:center;gap:10px}
        .logo{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#19c37d,#10a37f);display:flex;align-items:center;justify-content:center;font-weight:800;color:#0b0c0d}
        .title{font-weight:600}
        .disclosure{font-size:12px;color:var(--muted)}
        .main{max-width:var(--max);margin:0 auto;padding:0 12px 80px}
        .chat{background:transparent;border:1px solid var(--border);border-radius:14px;overflow:hidden}
        .message{display:flex;gap:12px;padding:16px;border-bottom:1px solid var(--border)}
        .message:last-child{border-bottom:0}
        .message.user .bubble{background:transparent}
        .message.bot .bubble{background:var(--panel)}
        .avatar{width:28px;height:28px;border-radius:6px;background:#2e2f34;display:flex;align-items:center;justify-content:center}
        .bubble{flex:1;padding:12px 14px;border-radius:12px;white-space:pre-wrap;word-break:break-word}
        .typing{opacity:.8;animation:pulse 1.2s infinite}
        @keyframes pulse{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
        .composer{position:sticky;bottom:12px;margin-top:12px}
        .row{display:flex;gap:8px;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:10px 10px}
        .select{flex:1;background:transparent;color:var(--fg);border:0;outline:none}
        .send{background:var(--accent);color:#0b0c0d;border:0;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer}
        .send:hover{filter:brightness(1.05)}
        .hint{margin-top:6px;font-size:12px;color:var(--muted);text-align:center}
        .plan{display:block}
        .plan-head{display:flex;align-items:center;justify-content:space-between}
        .plan-title{font-weight:600}
        .score{background:#19c37d22;border:1px solid #19c37d33;color:#9be2c7;padding:4px 8px;border-radius:12px;font-size:12px}
        .steps{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:10px}
        .step{border:1px solid var(--border);border-radius:12px;padding:12px}
        .step-head{display:flex;justify-content:space-between;align-items:center}
        .step-title{font-weight:600}
        .impact{font-size:12px;opacity:.9}
        .why{color:var(--muted);margin-top:4px}
        .how{margin:8px 0 0 18px}
        .vendors{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin-top:10px}
        .vendor{border:1px solid var(--border);border-radius:12px;padding:10px;background:#2f3136}
        .vendor:hover{border-color:#19c37d66}
        .v-name{font-weight:600}
        .v-blurb{font-size:14px;color:#c7c9cf}
        .tag{margin-top:6px;font-size:12px;color:#9aa0a6}
        .foot{max-width:var(--max);margin:24px auto 30px;text-align:center;color:var(--muted);font-size:12px}
        @media (max-width:600px){ .chat{border-radius:10px} .row{border-radius:10px} }
      `}</style>
    </div>
  );
}
