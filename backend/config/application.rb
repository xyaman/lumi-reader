require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Backend
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    session_cookie_key = ENV["SESSION_COOKIE_KEY"].presence || "_lumi_session"

    if Rails.env.production?
      config.session_store :cookie_store, key: session_cookie_key, domain: "lumireader.app"

      # Action Cable (Websockets) — comma-separated list in ACTION_CABLE_ALLOWED_ORIGINS.
      config.action_cable.allowed_request_origins =
        ENV.fetch("ACTION_CABLE_ALLOWED_ORIGINS", "https://lumireader.app").split(",").map(&:strip)
    else
      config.session_store :cookie_store, key: session_cookie_key

      # Action Cable (Websockets)
      config.action_cable.allowed_request_origins = [ "http://localhost:5173" ]
    end

    # Required for all session management
    config.middleware.use ActionDispatch::Flash
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options


    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true
  end
end
