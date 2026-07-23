import type { Metadata } from "next";
import { ProsePage, ProseSection } from "@/components/prose-page";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Ragaflow.",
};

const CONTACT_EMAIL = "support@ragaflow.io";

function MailLink() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="text-[#E6DCCA] underline underline-offset-2 hover:text-[#E6DCCA]/80"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

export default function SupportPage() {
  return (
    <ProsePage title="Support">
      <p>
        Ragaflow serves Indian classical ragas for focus, sleep, and meditation.
        If something isn&rsquo;t working or you have a question, we&rsquo;re happy
        to help.
      </p>

      <ProseSection heading="Contact us">
        <p>
          Email <MailLink />{" "}and we&rsquo;ll get back to you. Including your
          account email and the device you&rsquo;re using (web, or iPhone model)
          helps us resolve things faster.
        </p>
      </ProseSection>

      <ProseSection heading="Common questions">
        <p>
          <strong className="text-[#E6DCCA]">Do I need an account?</strong> Yes —
          an account keeps your favorites, defaults, and listening progress in
          sync across devices.
        </p>
        <p>
          <strong className="text-[#E6DCCA]">Does it cost anything?</strong>{" "}
          Ragaflow is free to use right now. If that changes, we&rsquo;ll make it
          clear before anything is charged.
        </p>
        <p>
          <strong className="text-[#E6DCCA]">Audio won&rsquo;t play.</strong>{" "}
          Playback needs an internet connection. If a session won&rsquo;t start,
          check your connection, then fully close and reopen the app. If it keeps
          happening, email us the track name and what you saw.
        </p>
        <p>
          <strong className="text-[#E6DCCA]">
            How do I delete my account?
          </strong>{" "}
          Go to Profile → Delete account. This permanently deletes your account
          and all of your data — favorites, listening history, certifications,
          and default tracks. You can also email <MailLink />{" "}from your
          account address and we&rsquo;ll delete it for you. See our{" "}
          <a
            href="/privacy"
            className="text-[#E6DCCA] underline underline-offset-2 hover:text-[#E6DCCA]/80"
          >
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
