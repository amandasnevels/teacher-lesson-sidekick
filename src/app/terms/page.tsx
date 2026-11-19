import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Terms of Service · Teacher Sidekick", description: "The terms for using Teacher Sidekick." };

export default function Terms() {
  return (
    <InfoPage title="Terms of Service" updated="November 19, 2026">
      <p>
        These terms apply to Teacher Sidekick (the website at sidekick.nevellabs.com, the installable web app and the Mac app), made by
        Amanda Nevels doing business as NevelLabs (&ldquo;we&rdquo;). By using Teacher Sidekick you agree to them.
      </p>

      <h2>Who it&rsquo;s for</h2>
      <p>
        Teacher Sidekick is a tool for teachers and other school staff. Students should not create accounts. You are responsible for using it in
        line with your school&rsquo;s or district&rsquo;s policies.
      </p>

      <h2>Your content and student information</h2>
      <ul>
        <li>You own what you add: rosters, notes, objectives, pictures and settings.</li>
        <li>Student information stays on your device, as described in our <a href="/privacy">Privacy Policy</a>. You are responsible for the student information you enter and for the device you use.</li>
        <li>Only upload pictures and materials you have the right to use.</li>
      </ul>

      <h2>Accounts</h2>
      <p>
        Accounts are optional. Keep your password private. You can delete your account at any time from the main menu, or by emailing us. We may
        suspend accounts that misuse the service.
      </p>

      <h2>Acceptable use</h2>
      <p>Don&rsquo;t use Teacher Sidekick to break the law, harm others, or try to access other people&rsquo;s accounts or data.</p>

      <h2>Free and paid features</h2>
      <p>
        Teacher Sidekick is currently free. If we add paid features, their prices and terms will be shown before you buy. Purchases made through
        an app store follow that store&rsquo;s terms as well.
      </p>

      <h2>No warranty</h2>
      <p>
        Teacher Sidekick is provided &ldquo;as is&rdquo;. We work hard to keep it reliable, but we can&rsquo;t promise it will always be
        available or error-free. Keep your own copies of anything important (for example with Export settings pack).
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential losses, or for lost data, arising from your use of Teacher
        Sidekick.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. We&rsquo;ll change the date above, and continued use means you accept the updated terms.</p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </InfoPage>
  );
}
