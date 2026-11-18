import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Support · Teacher Sidekick", description: "Help with Teacher Sidekick: getting started, the Mac app, accounts and privacy." };

export default function Support() {
  return (
    <InfoPage title="Support">
      <p>
        Need help? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&rsquo;ll get back to you, usually within two school days.
        Please don&rsquo;t include student names in your message.
      </p>

      <h2>Getting started</h2>
      <ul>
        <li>Open Teacher Sidekick and choose a workspace preset (Whole Group, Stations &amp; Centers, Testing and more).</li>
        <li>Add a class from <b>Active Class &rarr; New class</b> and paste your roster.</li>
        <li>Drag a widget by its ⠿ handle to move it; drag a corner to resize it; use ••• for size and settings.</li>
        <li>Tap <b>Main menu</b> to switch presets at any time.</li>
      </ul>

      <h2>Use it offline</h2>
      <ul>
        <li><b>Chrome, Edge or a Chromebook:</b> use <b>Install app</b> in the &ldquo;Download Sidekick&rdquo; card (welcome screen or Settings).</li>
        <li><b>iPad:</b> in Safari, tap Share &rarr; Add to Home Screen.</li>
        <li><b>Mac app:</b> use <b>Download for Mac</b>, unzip, and drag Teacher Sidekick into Applications.</li>
      </ul>

      <h2>Common questions</h2>
      <ul>
        <li><b>My classes are gone after a new visit.</b> On the website, teaching data stays in the open tab for privacy. Use Settings &rarr; Data &amp; Privacy &rarr; Export settings pack, or a free account, to keep your layouts.</li>
        <li><b>The Voice Level meter doesn&rsquo;t move.</b> Tap Enable microphone and allow microphone access when asked (on a Mac: System Settings &rarr; Privacy &amp; Security &rarr; Microphone).</li>
        <li><b>I didn&rsquo;t get the confirmation email.</b> Check your spam folder, then try again from Log in &rarr; Forgot password.</li>
        <li><b>How do I delete my account?</b> Sign in, open the main menu and choose Delete account.</li>
      </ul>

      <h2>Privacy</h2>
      <p>
        Student information stays on your device. Read the full <a href="/privacy">Privacy Policy</a>.
      </p>
    </InfoPage>
  );
}
