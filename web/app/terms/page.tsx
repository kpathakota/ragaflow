import type { Metadata } from "next";
import { ProsePage, ProseSection } from "@/components/prose-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Ragaflow.",
};

const CONTACT_EMAIL = "support@ragaflow.io";

export default function TermsPage() {
  return (
    <ProsePage title="Terms of Service" subtitle="Last updated: July 21, 2026">
      <p>
        These Terms govern your use of Ragaflow&rsquo;s app and website (the
        &ldquo;Service&rdquo;), operated by Ragaflow (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;). By creating an account or using the Service, you agree
        to these Terms. If you don&rsquo;t agree, please don&rsquo;t use the
        Service.
      </p>

      <ProseSection heading="The Service">
        <p>
          Ragaflow streams curated Indian classical music sessions for focus,
          sleep, and meditation. The Service, including recordings, ragam
          descriptions, and artist notes, is provided for your personal,
          non-commercial listening.
        </p>
      </ProseSection>

      <ProseSection heading="Your account">
        <p>
          You need an account to use the Service. You&rsquo;re responsible for
          keeping your login secure and for activity under your account. Provide
          accurate information, and let us know if you suspect unauthorized use.
          You must be old enough to form a binding contract in your jurisdiction
          to create an account.
        </p>
      </ProseSection>

      <ProseSection heading="Acceptable use">
        <p>Please don&rsquo;t:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Copy, download (except where the Service explicitly allows it),
            redistribute, publicly perform, or resell the recordings or other
            content
          </li>
          <li>
            Reverse-engineer, scrape, or attempt to extract the underlying audio
            or data
          </li>
          <li>
            Interfere with or disrupt the Service, or access it through automated
            means except a standard web browser or our apps
          </li>
          <li>Use the Service unlawfully or to infringe anyone&rsquo;s rights</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these Terms.
        </p>
      </ProseSection>

      <ProseSection heading="Content and intellectual property">
        <p>
          The recordings, artwork, text, and software are owned by us or our
          contributors and are protected by intellectual-property laws. We grant
          you a limited, personal, non-transferable, revocable license to stream
          the content for your own listening. No other rights are granted.
        </p>
      </ProseSection>

      <ProseSection heading="Payments and subscriptions">
        <p>
          The Service is currently free. If we introduce paid subscriptions or
          purchases in the future:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Prices and what each plan includes will be shown before you buy.</li>
          <li>
            Purchases made through the Apple App Store are billed by Apple and
            governed by Apple&rsquo;s terms; manage or cancel them in your Apple
            account settings.
          </li>
          <li>Purchases made on the web are billed by our web payment processor.</li>
          <li>
            Except where required by law or a platform&rsquo;s rules, payments
            are non-refundable.
          </li>
        </ul>
        <p>
          We&rsquo;ll make material pricing changes clear before they take
          effect.
        </p>
      </ProseSection>

      <ProseSection heading="Availability and changes">
        <p>
          We may change, suspend, or discontinue parts of the Service, and we may
          update these Terms. If we make material changes, we&rsquo;ll update the
          date above and, where appropriate, notify you in the app. Continuing to
          use the Service after changes take effect means you accept the updated
          Terms.
        </p>
      </ProseSection>

      <ProseSection heading="Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranties of any kind, to the fullest extent
          permitted by law. Ragaflow is for relaxation and focus; it is{" "}
          <strong className="text-[#E6DCCA]">not</strong> a medical device or a
          substitute for professional medical, psychological, or sleep-related
          advice. Don&rsquo;t use the Service while driving or doing anything that
          requires your full attention.
        </p>
      </ProseSection>

      <ProseSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Ragaflow and its contributors
          won&rsquo;t be liable for any indirect, incidental, or consequential
          damages arising from your use of the Service. Our total liability for
          any claim relating to the Service is limited to the amount you paid us
          in the twelve months before the claim (which, while the Service is
          free, is zero).
        </p>
      </ProseSection>

      <ProseSection heading="Termination">
        <p>
          You can stop using the Service and delete your account at any time (see
          the{" "}
          <a
            href="/privacy"
            className="text-[#E6DCCA] underline underline-offset-2 hover:text-[#E6DCCA]/80"
          >
            Privacy Policy
          </a>{" "}
          for how to request deletion). We may suspend or terminate your access if
          you violate these Terms or if we discontinue the Service.
        </p>
      </ProseSection>

      <ProseSection heading="Governing law">
        <p>
          These Terms are governed by the laws of the State of Oregon, United
          States, without regard to its conflict-of-laws rules.
        </p>
      </ProseSection>

      <ProseSection heading="Contact">
        <p>
          Questions about these Terms:{" "}
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
