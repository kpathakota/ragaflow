import type { Metadata } from "next";
import { ProsePage, ProseSection } from "@/components/prose-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ragaflow collects, uses, and protects your data.",
};

const CONTACT_EMAIL = "support@ragaflow.io";

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" subtitle="Last updated: July 22, 2026">
      <p>
        Ragaflow (&ldquo;we&rdquo;, &ldquo;us&rdquo;) makes an app and website
        that stream Indian classical music sessions for focus, sleep, and
        meditation. This policy explains what we collect, why, and the choices
        you have. We keep it short because the short version is the honest
        version: we collect the minimum needed to run the app, and we don&rsquo;t
        sell your data.
      </p>

      <ProseSection heading="What we collect">
        <p>
          <strong className="text-[#E6DCCA]">Account information.</strong> When
          you create an account we collect your email address and a securely
          hashed password (handled by our authentication provider, Supabase). If
          you set a display name, we store that too.
        </p>
        <p>
          <strong className="text-[#E6DCCA]">Your activity in the app.</strong>{" "}
          To make the app work and remember your preferences, we store the
          tracks and ragas you favorite, your default track for each moment
          (focus, sleep, meditate), your listening sessions (which track, which
          moment, when it started and ended, and how long you listened), and
          your certifications (cumulative listening time per ragam, used to show
          progress).
        </p>
        <p>
          <strong className="text-[#E6DCCA]">Analytics events.</strong> We record
          basic product events (for example: app opened, a moment was viewed, an
          error occurred) to understand how the app is used and to fix problems.
          Each event includes an anonymous session identifier, the event type,
          and the platform (web or iOS). When you are signed in, events may be
          associated with your account.
        </p>
        <p>
          <strong className="text-[#E6DCCA]">We do not collect</strong> your
          location, contacts, photos, health data, or device advertising
          identifiers. We do not use third-party advertising or cross-app
          tracking, and Ragaflow does not track you across other companies&rsquo;
          apps or websites.
        </p>
      </ProseSection>

      <ProseSection heading="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To authenticate you and keep you signed in</li>
          <li>
            To save your favorites, defaults, and listening progress across your
            devices
          </li>
          <li>To operate and improve the app, and to diagnose errors</li>
          <li>
            To communicate with you about your account or the service when
            necessary
          </li>
        </ul>
        <p>
          We do not sell your personal information, and we do not share it with
          data brokers or advertisers.
        </p>
      </ProseSection>

      <ProseSection heading="Where your data lives">
        <p>
          Your data is stored in our backend provider, Supabase, and audio is
          delivered through our content-delivery provider, Cloudflare. These
          providers process data on our behalf to run the service. Data may be
          stored and processed in the United States.
        </p>
      </ProseSection>

      <ProseSection heading="Your choices">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-[#E6DCCA]">Access or correct your data:</strong>{" "}
            update your profile in the app, or contact us.
          </li>
          <li>
            <strong className="text-[#E6DCCA]">Delete your account:</strong>{" "}
            delete your account in the app (Profile → Delete account), or email{" "}
            {CONTACT_EMAIL} and we will do it for you. Deletion removes your
            account and associated personal data — favorites, listening history,
            certifications, and default tracks. If you purchased a subscription,
            our merchant of record (Polar) retains payment records as required
            for legal and tax purposes.
          </li>
          <li>
            <strong className="text-[#E6DCCA]">Stop analytics:</strong> analytics
            is tied to using the app; if you would prefer we not associate events
            with your account, contact us.
          </li>
        </ul>
      </ProseSection>

      <ProseSection heading="Children">
        <p>
          Ragaflow is not directed to children under 13, and we do not knowingly
          collect personal information from children under 13. If you believe a
          child has provided us personal information, contact us and we will
          delete it.
        </p>
      </ProseSection>

      <ProseSection heading="Changes">
        <p>
          If we make material changes to this policy we will update the date
          above and, where appropriate, notify you in the app.
        </p>
      </ProseSection>

      <ProseSection heading="Contact">
        <p>
          Questions, requests, or account deletion:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[#E6DCCA] underline underline-offset-2 hover:text-[#E6DCCA]/80"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </ProseSection>
    </ProsePage>
  );
}
