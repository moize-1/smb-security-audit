import React, { useMemo, useState, useEffect } from "react";

/**
 * SMB Security & IT Hygiene Copilot – MVP (single-file React component)
 *
 * How to use (Next.js):
 * 1) Drop this file into app/page.jsx or pages/index.jsx and export default component below.
 * 2) Ensure TailwindCSS is set up (https://tailwindcss.com/docs/guides/nextjs).
 * 3) Replace affiliate URLs with yours; we append ?subId= automatically if present in page URL.
 * 4) Add your GTM dataLayer in _app.tsx or layout.tsx; we push events to window.dataLayer.
 * 5) Ship. (Vercel recommended.)
 */

// -------------------------------
// Affiliate Catalog (replace URLs)
// -------------------------------
const AFFILIATE =
  passwordManager: [
    {
      name: "1Password Business",
      url: "https://example.affinex.link/1password",
      blurb: "Best overall for SMBs; easy onboarding, shared vaults, policy controls.",
      affiliate: true,
    },
    {
      name: "Dashlane Business",
      url: "https://example.affinex.link/dashlane",
      blurb: "Great admin console and SSO support.",
      affiliate: true,
    },
  ],
  endpoint: [
    {
      name: "Bitdefender GravityZone",
      url: "https://example.affinex.link/bitdefender",
      blurb: "Strong protection + light agent; scales from 5 to 500 seats.",
      affiliate: true,
    },
    {
      name: "Malwarebytes for Teams",
      url: "https://example.affinex.link/malwarebytes",
      blurb: "Simple, effective endpoint for small teams.",
      affiliate: true,
    },
  ],
  backup: [
    {
      name: "Backblaze Business Backup",
      url: "https://example.affinex.link/backblaze",
      blurb: "Automated, offsite backups for laptops and desktops.",
      affiliate: true,
    },
    {
      name: "Acronis Cyber Protect",
      url: "https://example.affinex.link/acronis",
      blurb: "Image-based backup + cyber protection in one.",
      affiliate: true,
    },
  ],
  vpn: [
    {
      name: "NordLayer (NordVPN Teams)",
      url: "https://example.affinex.link/nordvpn",
      blurb: "Business VPN + secure network access for remote staff.",
      affiliate: true,
    },
    {
      name: "Surfshark One for Business",
      url: "https://example.affinex.link/surfshark",
      blurb: "Affordable remote security bundle (VPN, AV, alerts).",
      affiliate: true,
    },
  ],
  emailSecurity: [
    {
      name: "TitanHQ (SpamTitan)",
      url: "https://www.titanhq.com/spamtitan/",
      blurb: "Layered email security for Microsoft 365 & Google Workspace.",
    },
    {
      name: "Barracuda Email Protection",
      url: "https://www.barracuda.com/products/email-protection",
      blurb: "Advanced inbound filtering + account takeover protection.",
    },
  ],
  mfa: [
    {
      name: "Microsoft Entra ID (MFA)",
      url: "https://learn.microsoft.com/en-us/entra/identity/authentication/howto-mfa-getstarted",
      blurb: "Built-in MFA for Microsoft 365 tenants.",
    },
    {
      name: "Google Workspace 2‑Step Verification",
      url: "https://support.google.com/a/answer/175197",
      blurb: "Enforce 2‑Step Verification across your org.",
    },
    {
      name: "Duo MFA",
      url: "https://duo.com/product/multi-factor-authentication-mfa",
      blurb: "Flexible MFA supporting a wide range of apps and devices.",
    },
  ],
  mdm: [
    {
      name: "Microsoft Intune (MDM)",
      url: "https://www.microsoft.com/en-us/security/business/microsoft-intune",
      blurb: "Device compliance, OS patching, and app policies for Windows/macOS/iOS.",
    },
    {
      name: "Kandji (Apple MDM)",
      url: "https://www.kandji.io/",
      blurb: "Great for Mac fleets; automated compliance and remediations.",
    },
  ],
};

// -------------------------------
// Questions (lightweight, editable)
// -------------------------------
const QUESTIONS = [
  {
    key: "employees",
    label: "How many employees do you have?",
    type: "select",
    options: ["1", "2-5", "6-15", "16-50", "51-200", "200+"],
  },
  {
    key: "suite",
    label: "Primary work suite?",
    type: "select",
    options: ["Microsoft 365", "Google Workspace", "Both/Other"],
  },
  {
    key: "mfa",
    label: "Is MFA enforced for all accounts?",
    type: "select",
    options: ["All users", "Some users", "Not enforced"],
  },
  {
    key: "pwdmgr",
    label: "Team password manager in use?",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    key: "endpoint",
    label: "Endpoint protection (EDR/AV) on all devices?",
    type: "select",
    options: ["All devices", "Some devices", "No"],
  },
  {
    key: "backup",
    label: "Automated, offsite backups for important data?",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    key: "emailsec",
    label: "Extra email security beyond built‑in?",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    key: "remote",
    label: "How many remote workers?",
    type: "select",
    options: ["None", "Some", "Many/Most"],
  },
  {
    key: "mdm",
    label: "Do you use MDM/device management (Intune/Jamf/etc.)?",
    type: "select",
    options: ["Yes", "Partial", "No"],
  },
  {
    key: "pii",
    label: "Do you process payments or store customer PII?",
    type: "select",
    options: ["Yes", "No"],
  },
] as const;

type Answers = Record<(typeof QUESTIONS)[number]["key"], string>;

// -------------------------------
// Utility: grab subId from URL and append to affiliate links
// -------------------------------
function withSubId(baseUrl: string, subId?: string | null) {
  try {
    const url = new URL(baseUrl);
    if (subId) url.searchParams.set("subId", subId);
    return url.toString();
  } catch {
    // If not a valid URL (e.g. docs links), just return as-is
    return baseUrl;
  }
}

// -------------------------------
// Risk Engine – very simple, transparent scoring
// -------------------------------
function computePlan(a: Answers) {
  // Base risk points
  let risk = 0;
  const steps: {
    id: string;
    title: string;
    why: string;
    how: string[];
    category?: keyof typeof AFFILIATE;
    impact: number; // 1-5
    effort: "Low" | "Medium" | "High";
  }[] = [];

  const manyUsers = ["6-15", "16-50", "51-200", "200+"].includes(a.employees);

  // MFA
  if (a.mfa !== "All users") {
    risk += 3;
    steps.push({
      id: "mfa",
      title: "Enforce MFA for all accounts",
      why: "Stops most account-takeover attacks from stolen or guessed passwords.",
      how: [
        a.suite === "Microsoft 365"
          ? "Use Conditional Access in Entra ID to require MFA for all users."
          : a.suite === "Google Workspace"
          ? "Turn on 2‑Step Verification for all users in Admin console."
          : "Choose MFA across your login providers (Duo is flexible across apps).",
      ],
      category: "mfa",
      impact: 5,
      effort: "Low",
    });
  }

  // Password Manager
  if (a.pwdmgr !== "Yes") {
    risk += 2;
    steps.push({
      id: "pwdmgr",
      title: "Adopt a team password manager",
      why: "Reduces reuse of weak passwords and enables secure sharing.",
      how: ["Create shared vaults for teams; require strong, unique passwords; enable SSO if available."],
      category: "passwordManager",
      impact: 4,
      effort: "Low",
    });
  }

  // Endpoint protection
  if (a.endpoint !== "All devices") {
    risk += 2;
    steps.push({
      id: "endpoint",
      title: "Deploy endpoint protection on all devices",
      why: "Blocks malware/ransomware before it spreads across employee machines.",
      how: ["Roll out a single EDR/AV to all endpoints and monitor alerts weekly."],
      category: "endpoint",
      impact: 4,
      effort: a.endpoint === "No" ? "Medium" : "Low",
    });
  }

  // Backups
  if (a.backup !== "Yes") {
    risk += 3;
    steps.push({
      id: "backup",
      title: "Enable automated, offsite backups",
      why: "Limits business impact from ransomware, lost devices, or accidental deletion.",
      how: ["Back up laptops/desktops daily and test restores quarterly."],
      category: "backup",
      impact: 5,
      effort: "Medium",
    });
  }

  // Email security
  if (a.emailsec !== "Yes") {
    risk += 1;
    steps.push({
      id: "email",
      title: "Add advanced email security",
      why: "Catches phishing and malicious attachments that default filters miss.",
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

  // VPN for remote work
  if (["Some", "Many/Most"].includes(a.remote)) {
    risk += 1;
    steps.push({
      id: "vpn",
      title: "Provide secure remote access (VPN/ZTNA)",
      why: "Encrypts traffic over untrusted networks and limits exposure of internal services.",
      how: ["Issue accounts to all remote/staff on-the-go; restrict access by user/group."],
      category: "vpn",
      impact: 3,
      effort: "Low",
    });
  }

  // MDM if absent and many users
  if (a.mdm === "No" && manyUsers) {
    risk += 1;
    steps.push({
      id: "mdm",
      title: "Set up device management (MDM)",
      why: "Keeps devices patched, enforces disk encryption, and lets you wipe lost laptops.",
      how: ["Enroll all corporate devices; enforce screen lock, updates, and encryption."],
      category: "mdm",
      impact: 3,
      effort: "Medium",
    });
  }

  // PII/Payments => raise priority of email/backup/endpoint/MFA implicitly handled via impacts
  // Sort steps by impact descending, then by effort (Low < Medium < High)
  const effortRank = { Low: 0, Medium: 1, High: 2 } as const;
  steps.sort((a, b) => b.impact - a.impact || effortRank[a.effort] - effortRank[b.effort]);

  const top = steps.slice(0, 5);
  const score = Math.max(0, 100 - risk * 8); // crude score 0-100

  return { score, steps: top };
}

// -------------------------------
// UI
// -------------------------------
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
}

export default function SecurityAuditMVP() {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [subId, setSubId] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subId");
    if (sid) setSubId(sid);
  }, []);

  const complete = useMemo(() => QUESTIONS.every(q => !!answers[q.key as keyof Answers]), [answers]);
  const plan = useMemo(() => (complete ? computePlan(answers as Answers) : null), [complete, answers]);

  function handleStart() {
    setStarted(true);
    window?.dataLayer?.push({ event: "start_audit" });
  }

  function handleChange(key: keyof Answers, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function copyPlanToClipboard() {
    if (!plan) return;
    const lines = [
      `Security Plan (Score: ${plan.score}/100)`,
      ...plan.steps.map(
        (s, i) => `${i + 1}. ${s.title}\nWhy: ${s.why}\nHow: ${s.how.join(" ")}`
      ),
      "\nGenerated by SMB Security Audit MVP",
    ];
    navigator.clipboard.writeText(lines.join("\n\n"));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center font-bold text-blue-700">S"C</div>
            <span className="text-lg font-semibold">SMB Security Copilot</span>
          </div>
          <div className="text-xs text-gray-500">We may earn a commission from recommended tools.</div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pb-6">
        <Card className="p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Free SMB Security Audit</h1>
              <p className="mt-3 text-gray-700">
                Get a prioritized 10‑minute plan to reduce risk: MFA, passwords, endpoint, backups & email security.
              </p>
              <div className="mt-6 flex items-center gap-3">
                {!started ? (
                  <button
                    onClick={handleStart}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white font-medium shadow hover:bg-blue-700"
                  >
                    Start Audit
                  </button>
                ) : (
                  <a href="#audit" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white font-medium shadow hover:bg-blue-700">
                    Continue
                  </a>
                )}
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 font-medium hover:bg-gray-50"
                >
                  How it works
                </a>
              </div>
              <ul className="mt-6 text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>No jargon. Clear steps. Tools matched to your setup.</li>
                <li>We keep recommendations independent; affiliate links are disclosed.</li>
                <li>Copy or export your plan to share with your team.</li>
              </ul>
            </div>
            <div className="md:pl-8">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-sm text-gray-500">Sample Output</div>
                <div className="mt-2 space-y-3">
                  {[
                    { t: "Enforce MFA for all accounts", b: "Stops most account takeovers; enable org‑wide in your suite." },
                    { t: "Adopt a team password manager", b: "Secure sharing and unique passwords; roll out to all." },
                    { t: "Deploy endpoint protection", b: "Block malware/ransomware; monitor alerts weekly." },
                    { t: "Enable automated backups", b: "Protect from ransomware & loss; test restores quarterly." },
                    { t: "Add advanced email security", b: "Catch phishing and malicious attachments." },
                  ].map((x, i) => (
                    <div key={i} className="rounded-xl border p-3">
                      <div className="font-medium">{i + 1}. {x.t}</div>
                      <div className="text-sm text-gray-600">{x.b}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Audit */}
      <section id="audit" className="max-w-5xl mx-auto px-4 py-8">
        <Card className="p-6">
          <SectionTitle title="Answer a few questions" subtitle="It takes ~2 minutes." />
          <div className="grid md:grid-cols-2 gap-6">
            {QUESTIONS.map(q => (
              <div key={q.key}>
                <Label>{q.label}</Label>
                <select
                  className="w-full rounded-xl border-gray-300 focus:border-blue-600 focus:ring-blue-600"
                  value={(answers as any)[q.key] || ""}
                  onChange={(e) => handleChange(q.key as keyof Answers, e.target.value)}
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  {q.options.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">We won’t collect personal data—answers stay in your browser.</div>
            <button
              disabled={!complete}
              onClick={() => {
                setShowPlan(true);
                if (complete) {
                  window?.dataLayer?.push({ event: "view_plan" });
                }
              }}
              className={`rounded-xl px-5 py-3 font-medium shadow ${
                complete ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Get My Plan
            </button>
          </div>
        </Card>
      </section>

      {/* Plan */}
      {showPlan && plan && (
        <section className="max-w-5xl mx-auto px-4 py-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <SectionTitle title="Your prioritized security plan" subtitle="Tackle steps top to bottom for fastest risk reduction." />
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-700 text-sm font-medium">Score: {plan.score}/100</div>
                <button onClick={copyPlanToClipboard} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">Copy plan</button>
              </div>
            </div>

            <div className="space-y-4">
              {plan.steps.map((s, i) => (
                <div key={s.id} className="rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{i + 1}. {s.title}</div>
                      <div className="mt-1 text-sm text-gray-600">Why: {s.why}</div>
                      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
                        {s.how.map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                      {s.category && (
                        <div className="mt-4">
                          <div className="text-sm font-medium">Vetted tool options</div>
                          <div className="mt-2 grid md:grid-cols-2 gap-3">
                            {(AFFILIATE[s.category] || []).map(opt => (
                              <a
                                key={opt.name}
                                href={withSubId(opt.url, subId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => window?.dataLayer?.push({
                                  event: "affiliate_click",
                                  category: s.category,
                                  vendor: opt.name,
                                })}
                                className="group rounded-xl border p-4 hover:border-blue-600 hover:shadow"
                              >
                                <div className="font-medium group-hover:text-blue-700">{opt.name}</div>
                                <div className="text-sm text-gray-600">{opt.blurb}</div>
                                <div className="mt-2 inline-flex items-center gap-2 text-sm">
                                  <span className="rounded-md bg-gray-100 px-2 py-1">
                                    {opt.affiliate ? "Affiliate" : "External"}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1 text-xs text-gray-700">
                        <span>Impact</span>
                        <span className="font-semibold">{"★".repeat(s.impact)}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">Effort: {s.effort}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Disclaimer: This checklist provides general security guidance and tool suggestions. Always tailor to your
              organization and consult a qualified professional for compliance‑sensitive environments.
            </div>
          </Card>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-8">
        <Card className="p-6">
          <SectionTitle title="How it works" />
          <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-700">
            <li>Answer 8–12 quick questions about your setup.</li>
            <li>We generate a prioritized plan (no email required).</li>
            <li>Pick tools you like; affiliate links are labeled and optional.</li>
            <li>Copy your plan and execute step‑by‑step.
            </li>
          </ol>
        </Card>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SMB Security Copilot · Built with care ·
        <span className="ml-1">Affiliate disclosure: we may earn commissions if you purchase via our links.</span>
      </footer>
    </div>
  );
}
