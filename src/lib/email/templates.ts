/**
 * Lead email templates: the internal notification the office receives and the
 * confirmation the customer receives.
 *
 * Deliberately dependency-free (no framework imports, no aliases) so the
 * templates can be rendered and previewed outside Astro. Everything a visitor
 * typed is HTML-escaped before it reaches markup; the layout is table-based
 * with inline styles because that is what Gmail, Outlook and Apple Mail all
 * render consistently.
 */

export type LeadSource = "contact_form" | "chat";

export type LeadRecord = {
  id: string;
  source: LeadSource;
  submittedAt: Date;
  fullName: string;
  email: string;
  phone: string;
  /** Human-readable service names, e.g. ["Plumbing", "Sewers"]. */
  services: string[];
  otherServiceDetail?: string;
  problem?: string;
  urgency?: string;
  isEmergency?: boolean;
  audience?: string;
  city?: string;
  timing?: string;
  notes?: string;
  sourcePage?: string;
  consentText: string;
};

export type BusinessInfo = {
  name: string;
  shortName: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  licenses: readonly string[];
  siteUrl: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const COLORS = {
  navy: "#002244",
  navyDark: "#001830",
  ink: "#0a2c4e",
  body: "#334e69",
  muted: "#546b82",
  line: "#e6e9ec",
  surface: "#f5f7fa",
  green: "#69be28",
  greenDark: "#457c17",
  greenTint: "#f0f9ea",
  red: "#b42318",
  redTint: "#fef3f2",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Keeps a header value on one line - a newline in a subject is a header-injection vector. */
function oneLine(value: string, max = 120): string {
  const flat = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 10 ? `+1${digits}` : `+${digits}`}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function shell({ preheader, body, business }: { preheader: string; body: string; business: BusinessInfo }): string {
  const logo = `${business.siteUrl}/email/jim-dandy-logo.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(business.name)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.surface};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.surface};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${COLORS.line};">
        <tr>
          <td style="background:${COLORS.navy};padding:22px 28px;border-bottom:4px solid ${COLORS.green};">
            <a href="${business.siteUrl}" style="text-decoration:none;">
              <img src="${logo}" width="200" height="45" alt="${escapeHtml(business.name)}" style="display:block;border:0;width:200px;height:auto;color:#ffffff;font-family:${FONT};font-size:20px;font-weight:bold;">
            </a>
          </td>
        </tr>
        ${body}
        <tr>
          <td style="background:${COLORS.navyDark};padding:22px 28px;font-family:${FONT};font-size:12px;line-height:18px;color:#b0bac5;">
            <strong style="color:#ffffff;">${escapeHtml(business.name)}</strong><br>
            ${escapeHtml(business.address)}<br>
            <a href="${business.phoneHref}" style="color:#87cb53;text-decoration:none;">${escapeHtml(business.phone)}</a>
            &nbsp;·&nbsp;
            <a href="mailto:${escapeHtml(business.email)}" style="color:#87cb53;text-decoration:none;">${escapeHtml(business.email)}</a><br>
            WA License ${business.licenses.map(escapeHtml).join(" · ")}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function detailRows(rows: [string, string | undefined, { href?: string; strong?: boolean }?][]): string {
  return rows
    .filter(([, value]) => value !== undefined && value.trim() !== "")
    .map(([label, value, opts]) => {
      const safe = escapeHtml(value!).replace(/\n/g, "<br>");
      const content = opts?.href
        ? `<a href="${escapeHtml(opts.href)}" style="color:${COLORS.greenDark};font-weight:600;text-decoration:none;">${safe}</a>`
        : opts?.strong
          ? `<strong>${safe}</strong>`
          : safe;
      return `<tr>
  <td valign="top" style="padding:10px 0;border-bottom:1px solid ${COLORS.line};font-family:${FONT};font-size:13px;line-height:20px;color:${COLORS.muted};width:30%;">${escapeHtml(label)}</td>
  <td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid ${COLORS.line};font-family:${FONT};font-size:15px;line-height:22px;color:${COLORS.ink};word-break:break-word;">${content}</td>
</tr>`;
    })
    .join("\n");
}

function button(label: string, href: string, variant: "green" | "navy" = "green"): string {
  const bg = variant === "green" ? COLORS.green : COLORS.navy;
  const fg = variant === "green" ? COLORS.navyDark : "#ffffff";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">
  <tr><td style="background:${bg};border-radius:999px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:${fg};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

function sourceLabel(source: LeadSource): string {
  return source === "chat" ? "Website chat assistant" : "Website contact form";
}

/** Internal notification: everything the dispatcher needs to call the customer back. */
export function leadNotificationEmail(lead: LeadRecord, business: BusinessInfo): RenderedEmail {
  const serviceSummary = lead.services.join(", ") || "Not specified";
  const subject = oneLine(
    `${lead.isEmergency ? "EMERGENCY - " : ""}New lead: ${lead.fullName} - ${serviceSummary}${lead.city ? ` (${lead.city})` : ""}`,
    150,
  );
  const when = formatWhen(lead.submittedAt);
  const pageUrl = lead.sourcePage ? `${business.siteUrl}${lead.sourcePage}` : undefined;

  const banner = lead.isEmergency
    ? `<tr><td style="background:${COLORS.redTint};padding:14px 28px;border-bottom:1px solid #fecdca;font-family:${FONT};font-size:15px;font-weight:700;color:${COLORS.red};">Emergency - the customer marked this as urgent. Call right away.</td></tr>`
    : "";

  const body = `${banner}
<tr>
  <td style="padding:28px 28px 8px;font-family:${FONT};">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${COLORS.greenDark};">New website lead</p>
    <h1 style="margin:0 0 6px;font-size:24px;line-height:30px;color:${COLORS.navy};">${escapeHtml(lead.fullName)}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:20px;color:${COLORS.muted};">${escapeHtml(sourceLabel(lead.source))} · ${escapeHtml(when)}</p>
    ${button(`Call ${lead.phone}`, telHref(lead.phone))}
    ${button("Reply by email", `mailto:${lead.email}`, "navy")}
  </td>
</tr>
<tr>
  <td style="padding:12px 28px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRows([
        ["Name", lead.fullName, { strong: true }],
        ["Phone", lead.phone, { href: telHref(lead.phone) }],
        ["Email", lead.email, { href: `mailto:${lead.email}` }],
        ["Service needed", serviceSummary, { strong: true }],
        ["Other service", lead.otherServiceDetail],
        ["Problem", lead.problem],
        ["Urgency", lead.urgency],
        ["Property type", lead.audience],
        ["City", lead.city],
        ["Preferred timing", lead.timing],
        ["Notes", lead.notes],
        ["Submitted from", pageUrl, pageUrl ? { href: pageUrl } : undefined],
        ["Consent", "Customer agreed to be contacted (call, text, email) about this request."],
        ["Reference", lead.id],
      ])}
    </table>
    <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${COLORS.muted};">
      Consent language shown to the customer: "${escapeHtml(lead.consentText)}"
    </p>
  </td>
</tr>`;

  const text = [
    lead.isEmergency ? "EMERGENCY - the customer marked this as urgent. Call right away.\n" : null,
    `New website lead (${sourceLabel(lead.source)})`,
    `Received: ${when}`,
    "",
    `Name: ${lead.fullName}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Service needed: ${serviceSummary}`,
    lead.otherServiceDetail ? `Other service: ${lead.otherServiceDetail}` : null,
    lead.problem ? `Problem: ${lead.problem}` : null,
    lead.urgency ? `Urgency: ${lead.urgency}` : null,
    lead.audience ? `Property type: ${lead.audience}` : null,
    lead.city ? `City: ${lead.city}` : null,
    lead.timing ? `Preferred timing: ${lead.timing}` : null,
    lead.notes ? `Notes: ${lead.notes}` : null,
    pageUrl ? `Submitted from: ${pageUrl}` : null,
    "Consent: customer agreed to be contacted about this request.",
    `Reference: ${lead.id}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    subject,
    html: shell({ preheader: `${serviceSummary} - call ${lead.phone}`, body, business }),
    text,
  };
}

/** Customer confirmation: a receipt of what they asked for and what happens next. */
export function customerConfirmationEmail(lead: LeadRecord, business: BusinessInfo): RenderedEmail {
  const name = firstName(lead.fullName);
  const serviceSummary = lead.services.join(", ") || "Plumbing service";
  const subject = oneLine(`We got your request, ${name} - ${business.shortName} Sewer & Plumbing`);

  const emergencyNote = lead.isEmergency
    ? `<tr><td style="padding:0 28px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${COLORS.redTint};border:1px solid #fecdca;border-radius:12px;padding:14px 16px;font-family:${FONT};font-size:15px;line-height:22px;color:${COLORS.red};"><strong>Is water or sewage actively coming in?</strong> Don't wait for our call - phone <a href="${business.phoneHref}" style="color:${COLORS.red};font-weight:700;">${escapeHtml(business.phone)}</a> now. A live dispatcher answers 24/7.</td></tr></table></td></tr>`
    : "";

  const body = `
<tr>
  <td style="padding:30px 28px 10px;font-family:${FONT};">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${COLORS.greenDark};">Request received</p>
    <h1 style="margin:0 0 14px;font-size:26px;line-height:32px;color:${COLORS.navy};">Thanks, ${escapeHtml(name)} - we're on it.</h1>
    <p style="margin:0 0 18px;font-size:16px;line-height:25px;color:${COLORS.body};">
      Your request reached our dispatch team. A Jim Dandy dispatcher will call or text you at
      <strong style="color:${COLORS.ink};">${escapeHtml(lead.phone)}</strong> shortly to confirm the details and book a time that works for you.
    </p>
  </td>
</tr>
${emergencyNote}
<tr>
  <td style="padding:8px 28px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.surface};border-radius:12px;">
      <tr><td style="padding:6px 18px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${detailRows([
            ["Service", serviceSummary, { strong: true }],
            ["Details", lead.otherServiceDetail ?? lead.problem],
            ["Urgency", lead.urgency],
            ["City", lead.city],
            ["Preferred timing", lead.timing],
            ["Phone", lead.phone],
            ["Email", lead.email],
          ])}
        </table>
      </td></tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:24px 28px 8px;font-family:${FONT};">
    <h2 style="margin:0 0 12px;font-size:18px;line-height:24px;color:${COLORS.navy};">What happens next</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${[
        ["1", "We call or text to confirm", "A dispatcher reviews your request and reaches out to schedule."],
        ["2", "Upfront quote before any work", "A licensed technician diagnoses the problem and prices the job first."],
        ["3", "30-minute arrival notice", "You'll hear from your tech before they head your way."],
      ]
        .map(
          ([n, title, copy]) => `<tr>
        <td valign="top" width="36" style="padding:0 0 14px;"><div style="width:28px;height:28px;line-height:28px;border-radius:999px;background:${COLORS.green};color:${COLORS.navyDark};font-family:${FONT};font-size:14px;font-weight:700;text-align:center;">${n}</div></td>
        <td valign="top" style="padding:3px 0 14px 8px;font-family:${FONT};font-size:15px;line-height:22px;color:${COLORS.body};"><strong style="color:${COLORS.ink};">${title}</strong><br>${copy}</td>
      </tr>`,
        )
        .join("\n")}
    </table>
  </td>
</tr>
<tr>
  <td style="padding:6px 28px 30px;font-family:${FONT};">
    <p style="margin:0 0 14px;font-size:15px;line-height:22px;color:${COLORS.body};">Need us sooner, or want to change something? Just call - or reply to this email.</p>
    ${button(`Call ${business.phone}`, business.phoneHref)}
    <p style="margin:16px 0 0;font-size:12px;line-height:18px;color:${COLORS.muted};">
      You're receiving this one-time email because you requested service at ${escapeHtml(business.siteUrl.replace(/^https?:\/\//, ""))}.
      If this wasn't you, please ignore it or let us know by replying.
    </p>
  </td>
</tr>`;

  const text = [
    `Thanks, ${name} - we're on it.`,
    "",
    `Your request reached the ${business.name} dispatch team. A dispatcher will call or text you at ${lead.phone} shortly to confirm the details.`,
    lead.isEmergency ? `\nIf water or sewage is actively coming in, call ${business.phone} now - a live dispatcher answers 24/7.` : null,
    "",
    `Service: ${serviceSummary}`,
    lead.otherServiceDetail || lead.problem ? `Details: ${lead.otherServiceDetail ?? lead.problem}` : null,
    lead.urgency ? `Urgency: ${lead.urgency}` : null,
    lead.city ? `City: ${lead.city}` : null,
    "",
    "What happens next:",
    "1. We call or text to confirm your appointment.",
    "2. A licensed technician quotes the job upfront before any work.",
    "3. You get a 30-minute arrival notice.",
    "",
    `Questions? Call ${business.phone} or reply to this email.`,
    "",
    business.name,
    business.address,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return {
    subject,
    html: shell({ preheader: `A dispatcher will contact you at ${lead.phone} shortly.`, body, business }),
    text,
  };
}
