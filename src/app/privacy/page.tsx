import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy Policy · Teacher Sidekick", description: "How Teacher Sidekick handles teacher and student information." };

export default function Privacy() {
  return (
    <InfoPage title="Privacy Policy" updated="November 18, 2026">
      <p>
        Teacher Sidekick is a set of classroom tools for teachers, made by NevelLabs. It is built so that <b>student information stays on the
        teacher&rsquo;s own device</b>. This policy covers the website (sidekick.nevellabs.com), the installable web app and the Mac app.
      </p>

      <h2>Student information stays on the device</h2>
      <ul>
        <li>Class rosters, student names, points, participation, mastery checks, hall passes and notes are stored only in the teacher&rsquo;s browser or Mac app on that device.</li>
        <li>This information is never sent to NevelLabs or anyone else, is never included in exported settings files, and is never saved to a teacher account.</li>
        <li>Students do not create accounts and do not use Teacher Sidekick directly. Teacher Sidekick is intended for use by teachers.</li>
        <li>On the website, teaching data is kept for the open browser tab and starts fresh on a new visit. The teacher can clear it at any time with &ldquo;End session &amp; start fresh&rdquo;.</li>
      </ul>

      <h2>Microphone</h2>
      <p>
        The Voice Level widget can use the microphone, only after the teacher turns it on and the device asks for permission. Sound is measured
        on the device to show a noise level. Audio is never recorded, stored or sent anywhere.
      </p>

      <h2>Pictures you upload</h2>
      <p>Pictures added to widgets (for example anchor charts or a secret picture) stay on the device and are not uploaded to NevelLabs.</p>

      <h2>Optional teacher accounts</h2>
      <p>Teachers can use every tool without an account. If a teacher creates one, we store:</p>
      <ul>
        <li>their email address and a securely hashed password (handled by our account provider, Supabase), and</li>
        <li>their saved setup: workspace layouts, widget settings, favorites, routines and theme. A saved setup never contains student names or class records.</li>
      </ul>
      <p>
        We use the email address only to sign in, confirm the account and reset passwords. We do not send marketing email without permission
        and we never sell or share personal information.
      </p>

      <h2>No ads, analytics or tracking</h2>
      <p>Teacher Sidekick has no advertising, no analytics or tracking tools, and no third-party cookies.</p>

      <h2>Service providers</h2>
      <ul>
        <li><b>Vercel</b> hosts the website. Like any web host, it processes basic request information (such as IP address) to deliver pages and keep the service secure.</li>
        <li><b>Supabase</b> stores optional teacher accounts and saved setups, protected so each teacher can only access their own.</li>
        <li><b>GitHub</b> hosts the Mac app download.</li>
      </ul>

      <h2>Deleting your information</h2>
      <ul>
        <li>Teaching data on a device: use &ldquo;End session &amp; start fresh&rdquo;, or Settings &rarr; Data &amp; Privacy.</li>
        <li>An account: open the main menu while signed in and choose <b>Delete account</b>. This permanently removes the account and its saved setup.</li>
        <li>Or email us and we will delete it for you.</li>
      </ul>

      <h2>Schools</h2>
      <p>
        Because student information is not collected by NevelLabs, Teacher Sidekick is designed to fit school privacy expectations under FERPA and
        COPPA. Schools and districts can contact us for a privacy summary or agreement.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If this policy changes, we will update this page and the date above. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </InfoPage>
  );
}
