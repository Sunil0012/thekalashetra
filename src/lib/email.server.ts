import { accountApprovalUrl } from "./account-approval";

export async function sendAccountApprovalEmail(user: { id: string; email: string; fullName?: string | null }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !user.email) return false;

  const approveUrl = accountApprovalUrl(user.id, "approved");
  const rejectUrl = accountApprovalUrl(user.id, "suspended");
  const from = process.env.MAIL_FROM || "Kalashetra <onboarding@resend.dev>";
  const name = user.fullName || user.email;
  const recipients = (process.env.ADMIN_EMAIL || "sunilnaikkethavath@gmail.com")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
  const results = await Promise.all(recipients.map(async (recipient) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Kalashetra account approval: ${name}`,
        html: `<p>A new Kalashetra account is waiting for approval.</p><p><strong>${name}</strong><br>${user.email}</p><p><a href="${approveUrl}">Approve account</a></p><p><a href="${rejectUrl}">Reject account</a></p><p>These links expire in ${7} days.</p>`,
      }),
    });
    return response.ok;
  }));
  return results.some(Boolean);
}
