require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Backend
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    if Rails.env.production?
      config.session_store :cookie_store, key: "_lumi_session", domain: "lumireader.app"

      # Action Cable (Websockets)
      config.action_cable.allowed_request_origins = [ "https://lumireader.app" ]
    else
      config.session_store :cookie_store, key: "_lumi_session"

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
