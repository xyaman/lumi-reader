export function AboutSettings() {
    return (
        <div class="space-y-10">
            <section>
                <h2 class="text-2xl font-semibold mb-4">Privacy Policy</h2>
                <div class="space-y-2 text-base05">
                    <p>
                        Lumi Reader is committed to privacy and transparency. We never sell, trade, or rent your
                        personal data to third parties. User data is only used for providing and improving the reading
                        experience, and for essential account features (such as book syncing).
                    </p>
                    <p>
                        <strong>Account Data:</strong> When you register, we store only your email, username, and
                        encrypted password. If you connect Patreon, your Patreon ID is used only to verify your tier and
                        sync your account, never for marketing purposes.
                    </p>
                    <p>
                        <strong>Reading Data:</strong> Your reading progress, sessions, and books are stored locally in
                        your browser. When{" "}
                        <a class="text-base0D underline" href="/settings/sessions">
                            Cloud syncing
                        </a>{" "}
                        is enabled, your book metadata and reading session summaries are stored securely on our servers
                        and never shared.
                    </p>
                    <p>
                        <strong>Cookies:</strong> Lumi Reader uses cookies solely for session management and
                        authentication. We do not use tracking or advertising cookies.
                    </p>
                    <p>
                        <strong>Copyright Notice:</strong> Lumi Reader does not provide, host, or distribute any books,
                        copyrighted or otherwise. Users are solely responsible for importing and managing their own book
                        files. No copyrighted material is included, shared, or made available by Lumi Reader.
                    </p>
                    <p>
                        <strong>Third Party Services:</strong> We use Patreon for optional account linking. We do not
                        share any personal data with Patreon except as required for verification.
                    </p>
                    <p>
                        <strong>Open Source:</strong> Lumi Reader is open source. You can review, audit, and contribute
                        to the code on{" "}
                        <a class="text-base0D underline" href="https://github.com/xyaman/lumi-reader">
                            GitHub
                        </a>
                        .
                    </p>
                    <p>
                        <strong>Updates:</strong> This policy may be updated. All changes will be posted here and are
                        effective immediately.
                    </p>
                    <p>For questions or requests regarding your data, please contact us.</p>
                </div>
            </section>

            <section>
                <h2 class="text-2xl font-semibold mb-4">About Lumi Reader</h2>
                <div class="space-y-4 text-base05">
                    <p>
                        Lumi Reader is a modern, web-based e-book reader designed for a clean, customizable, and
                        comfortable reading experience. Features include offline access, cloud sync, bookshelf
                        management, reading analytics, and privacy-first social activity.
                    </p>
                    <p>
                        <strong>Open Source:</strong> Lumi Reader is built for the community. Anyone can contribute or
                        audit the source code.
                        <br />
                        <a
                            class="text-base0D underline"
                            href="https://github.com/xyaman/lumi-reader"
                            target="_blank"
                            rel="noopener"
                        >
                            View the GitHub repository
                        </a>
                    </p>
                    <p>Lumi Reader does not provide, host, or distribute e-books. All content is user-managed.</p>
                </div>
            </section>

            <section>
                <h2 class="text-2xl font-semibold mb-4">Contact Us</h2>
                <div class="space-y-4">
                    <p>
                        Questions? Feedback? Need help?
                        <br />
                        Join our{" "}
                        <a
                            class="text-base0D underline"
                            href="https://discord.gg/NXzVRzgNxW"
                            target="_blank"
                            rel="noopener"
                        >
                            Discord Server
                        </a>
                        .
                    </p>
                    <p>Or reach out via GitHub Discussions for bug reports or feature requests.</p>
                </div>
            </section>
        </div>
    )
}
